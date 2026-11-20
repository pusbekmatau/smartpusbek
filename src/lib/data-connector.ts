import "server-only";
import Papa from "papaparse";
import { randomUUID } from "node:crypto";
import { getDataSource, type DataSourceConfig } from "./data-sources.config";
import { readJson, updateJson } from "./json-store";
import type { ConnectorMode, DataRow } from "./types";

/**
 * Data connector for the 17 backend modules.
 *
 *  - live  : two-way sync, either through the Sheets API v4 with a service account,
 *            or through the Apps Script web app (APPS_SCRIPT_URL + APPS_SCRIPT_TOKEN).
 *  - local : read via the public CSV export, writes persisted to
 *            data/overlay-store.json and merged on every read.
 *
 * Internal source identifiers and vendor error details never leave this module;
 * callers receive `DataSourceError` with a neutral, user-facing message.
 */

export class DataSourceError extends Error {
  constructor(
    public readonly code:
      | "MODULE_NOT_FOUND"
      | "SOURCE_RESTRICTED"
      | "SOURCE_UNAVAILABLE"
      | "ROW_NOT_FOUND"
      | "INVALID_COLUMN"
      | "WRITE_FAILED",
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

const RESTRICTED_MESSAGE =
  "Koneksi ke modul basis data ini sedang dibatasi oleh server. Silakan lakukan sinkronisasi ulang atau hubungi Administrator.";

export interface Dataset {
  slug: string;
  columns: string[];
  rows: DataRow[];
  syncedAt: string;
  mode: ConnectorMode;
}

/** Internal representation that remembers where each column lives in the source grid. */
interface SourceTable {
  columns: string[];
  columnIndex: number[];
  headerRow: number; // 1-based row number of the header in the source grid
  rows: DataRow[];
}

// ---------------------------------------------------------------------------
// Mode & credentials
// ---------------------------------------------------------------------------

type Backend = "api" | "script" | "local";

function backend(): Backend {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) return "api";
  if (process.env.APPS_SCRIPT_URL && process.env.APPS_SCRIPT_TOKEN) return "script";
  return "local";
}

export function connectorMode(): ConnectorMode {
  return backend() === "local" ? "local" : "live";
}

const CACHE_TTL_MS = Math.max(15, Number(process.env.DATA_CACHE_TTL_SECONDS) || 300) * 1000;

export function cacheTtlSeconds(): number {
  return CACHE_TTL_MS / 1000;
}

type ApiClient = Awaited<ReturnType<typeof createApiClient>>;
let apiClientPromise: Promise<ApiClient> | null = null;

async function createApiClient() {
  const { sheets, auth: googleAuth } = await import("@googleapis/sheets");
  const auth = new googleAuth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return sheets({ version: "v4", auth });
}

function apiClient(): Promise<ApiClient> {
  apiClientPromise ??= createApiClient().catch((err) => {
    apiClientPromise = null;
    throw err;
  });
  return apiClientPromise;
}

const tabTitles = new Map<string, string>();

async function resolveTabTitle(source: DataSourceConfig): Promise<string> {
  const key = `${source.documentId}:${source.tabId}`;
  const known = tabTitles.get(key);
  if (known) return known;
  const client = await apiClient();
  const meta = await client.spreadsheets.get({
    spreadsheetId: source.documentId,
    fields: "sheets.properties(sheetId,title)",
  });
  const tab = meta.data.sheets?.find((s) => s.properties?.sheetId === source.tabId) ?? meta.data.sheets?.[0];
  const title = tab?.properties?.title;
  if (!title) throw new Error("tab not found");
  tabTitles.set(key, title);
  return title;
}

function quoteTab(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

function columnLetter(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Raw grid acquisition
// ---------------------------------------------------------------------------

async function fetchGridLive(source: DataSourceConfig): Promise<string[][]> {
  const client = await apiClient();
  const title = await resolveTabTitle(source);
  const res = await client.spreadsheets.values.get({
    spreadsheetId: source.documentId,
    range: quoteTab(title),
    valueRenderOption: "FORMATTED_VALUE",
  });
  return (res.data.values ?? []).map((row) => row.map((cell) => (cell == null ? "" : String(cell))));
}

// ---------------------------------------------------------------------------
// Apps Script web app backend (no service account required)
// ---------------------------------------------------------------------------

async function scriptCall<T>(
  source: DataSourceConfig,
  action: "grid" | "cells" | "append" | "delete",
  payload: Record<string, unknown> = {},
): Promise<T> {
  const base = process.env.APPS_SCRIPT_URL as string;
  const token = process.env.APPS_SCRIPT_TOKEN as string;
  if (!source.script) throw new Error("source has no Apps Script code");

  let res: Response;
  if (action === "grid") {
    const url = new URL(base);
    url.searchParams.set("action", "grid");
    url.searchParams.set("src", source.script);
    url.searchParams.set("gid", String(source.tabId));
    url.searchParams.set("token", token);
    res = await fetch(url, { redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(90_000) });
  } else {
    res = await fetch(base, {
      method: "POST",
      redirect: "follow",
      cache: "no-store",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, token, src: source.script, gid: source.tabId, ...payload }),
      signal: AbortSignal.timeout(60_000),
    });
  }
  const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; data?: T } | null;
  if (!body || !body.ok) throw new Error(`apps script: ${body?.error ?? `HTTP ${res.status}`}`);
  return body.data as T;
}

async function fetchGridScript(source: DataSourceConfig): Promise<string[][]> {
  const data = await scriptCall<{ title: string; values: unknown[][] }>(source, "grid");
  return (data.values ?? []).map((row) => row.map((cell) => (cell == null ? "" : String(cell))));
}

async function fetchCsv(url: string): Promise<string | null> {
  const res = await fetch(url, { redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(25_000) });
  if (!res.ok) return null;
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("csv") && !type.includes("text/plain")) return null; // HTML = sign-in wall
  return res.text();
}

async function fetchGridPublic(source: DataSourceConfig): Promise<string[][]> {
  const base = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(source.documentId)}`;
  const candidates = [
    `${base}/export?format=csv&gid=${source.tabId}`,
    `${base}/gviz/tq?tqx=out:csv&headers=0&gid=${source.tabId}`,
  ];
  for (const url of candidates) {
    try {
      const text = await fetchCsv(url);
      if (text == null) continue;
      const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false });
      return parsed.data.map((row) => row.map((cell) => (cell == null ? "" : String(cell))));
    } catch (err) {
      console.warn("[connector] public read attempt failed", (err as Error).message);
    }
  }
  throw new DataSourceError("SOURCE_RESTRICTED", RESTRICTED_MESSAGE, 502);
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

function isBlankRow(row: string[]): boolean {
  return row.every((c) => !c || !c.trim());
}

/** Picks the first row (within the first 15) that looks like a header: many filled, mostly non-numeric cells. */
function detectHeaderRow(grid: string[][]): number {
  const width = Math.max(0, ...grid.slice(0, 50).map((r) => r.filter((c) => c.trim()).length));
  let best = 0;
  let bestScore = -1;
  for (let i = 0; i < Math.min(grid.length, 15); i += 1) {
    const cells = grid[i].map((c) => c.trim()).filter(Boolean);
    if (cells.length < Math.max(2, Math.ceil(width * 0.5))) continue;
    const textual = cells.filter((c) => !/^[\d.,\s%-]+$/.test(c)).length;
    const score = cells.length + textual * 2;
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
    if (cells.length >= width * 0.8 && textual >= cells.length * 0.7) return i;
  }
  return best;
}

function normaliseGrid(grid: string[][]): SourceTable {
  const cleanGrid = grid.map((r) => r.map((c) => c.replace(/\r/g, "")));
  if (cleanGrid.length === 0) return { columns: [], columnIndex: [], headerRow: 1, rows: [] };

  const headerIdx = detectHeaderRow(cleanGrid);
  const header = cleanGrid[headerIdx] ?? [];
  const body = cleanGrid.slice(headerIdx + 1);
  const width = Math.max(header.length, ...body.map((r) => r.length));

  const used = new Map<string, number>();
  const columns: string[] = [];
  const columnIndex: number[] = [];
  for (let c = 0; c < width; c += 1) {
    const label = (header[c] ?? "").replace(/\s+/g, " ").trim();
    const hasData = body.some((r) => (r[c] ?? "").trim());
    if (!label && !hasData) continue;
    let name = label || `Kolom ${columnLetter(c)}`;
    const seen = used.get(name.toLowerCase()) ?? 0;
    used.set(name.toLowerCase(), seen + 1);
    if (seen > 0) name = `${name} (${seen + 1})`;
    columns.push(name);
    columnIndex.push(c);
  }

  const rows: DataRow[] = [];
  body.forEach((raw, i) => {
    if (isBlankRow(raw)) return;
    const values: Record<string, string> = {};
    columns.forEach((name, k) => {
      values[name] = (raw[columnIndex[k]] ?? "").trim();
    });
    rows.push({ id: `r${headerIdx + 2 + i}`, values });
  });

  return { columns, columnIndex, headerRow: headerIdx + 1, rows };
}

// ---------------------------------------------------------------------------
// Local write overlay (fallback mode)
// ---------------------------------------------------------------------------

interface ModuleOverlay {
  added: DataRow[];
  edits: Record<string, Record<string, string>>;
  deleted: string[];
}

type OverlayStore = Record<string, ModuleOverlay>;

const OVERLAY = "overlay-store";

function emptyOverlay(): ModuleOverlay {
  return { added: [], edits: {}, deleted: [] };
}

function applyOverlay(table: SourceTable, overlay: ModuleOverlay | undefined): { columns: string[]; rows: DataRow[] } {
  if (!overlay) return { columns: table.columns, rows: table.rows };
  const deleted = new Set(overlay.deleted);
  const rows = table.rows
    .filter((r) => !deleted.has(r.id))
    .map((r) => (overlay.edits[r.id] ? { id: r.id, values: { ...r.values, ...overlay.edits[r.id] } } : r));
  const columns = [...table.columns];
  for (const added of overlay.added) {
    for (const key of Object.keys(added.values)) if (!columns.includes(key)) columns.push(key);
    rows.push(added);
  }
  return { columns, rows };
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

interface CacheEntry {
  at: number;
  table: SourceTable;
  syncedAt: string;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<CacheEntry>>();
const writeLocks = new Map<string, Promise<unknown>>();

export function invalidate(slug?: string): void {
  if (slug) cache.delete(slug);
  else cache.clear();
}

function requireSource(slug: string): DataSourceConfig {
  const source = getDataSource(slug);
  if (!source) throw new DataSourceError("MODULE_NOT_FOUND", "Modul data tidak ditemukan.", 404);
  return source;
}

async function loadTable(slug: string, force: boolean): Promise<CacheEntry & { cached: boolean }> {
  const source = requireSource(slug);
  const hit = cache.get(slug);
  if (!force && hit && Date.now() - hit.at < CACHE_TTL_MS) return { ...hit, cached: true };

  let pending = inflight.get(slug);
  if (!pending) {
    pending = (async () => {
      let grid: string[][];
      try {
        const mode = backend();
        grid =
          mode === "api" ? await fetchGridLive(source) : mode === "script" ? await fetchGridScript(source) : await fetchGridPublic(source);
      } catch (err) {
        if (err instanceof DataSourceError) throw err;
        console.error(`[connector] read failed for ${slug}:`, (err as Error).message);
        throw new DataSourceError("SOURCE_RESTRICTED", RESTRICTED_MESSAGE, 502);
      }
      const entry: CacheEntry = { at: Date.now(), table: normaliseGrid(grid), syncedAt: new Date().toISOString() };
      cache.set(slug, entry);
      return entry;
    })().finally(() => inflight.delete(slug));
    inflight.set(slug, pending);
  }
  return { ...(await pending), cached: false };
}

function withWriteLock<T>(slug: string, task: () => Promise<T>): Promise<T> {
  const previous = writeLocks.get(slug) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(task);
  writeLocks.set(slug, next);
  return next;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function loadDataset(slug: string, options: { force?: boolean } = {}): Promise<Dataset & { cached: boolean }> {
  const entry = await loadTable(slug, options.force ?? false);
  const mode = connectorMode();
  const overlay = mode === "local" ? (await readJson<OverlayStore>(OVERLAY, {}))[slug] : undefined;
  const { columns, rows } = applyOverlay(entry.table, overlay);
  return { slug, columns, rows, syncedAt: entry.syncedAt, mode, cached: entry.cached };
}

function sanitiseValues(columns: string[], values: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (!columns.includes(key)) {
      throw new DataSourceError("INVALID_COLUMN", `Kolom "${key}" tidak dikenal pada modul ini.`, 400);
    }
    out[key] = value == null ? "" : String(value).slice(0, 5000);
  }
  return out;
}

function liveWriteError(err: unknown): DataSourceError {
  if (err instanceof DataSourceError) return err;
  console.error("[connector] write failed:", (err as Error).message);
  return new DataSourceError(
    "WRITE_FAILED",
    "Server basis data menolak penulisan pada modul ini. Pastikan akun layanan/konektor memiliki hak edit, lalu coba kembali.",
    502,
  );
}

function rowNumberOf(rowId: string): number | null {
  const match = /^r(\d+)$/.exec(rowId);
  return match ? Number(match[1]) : null;
}

export async function createRecord(slug: string, input: Record<string, unknown>): Promise<DataRow> {
  return withWriteLock(slug, async () => {
    const source = requireSource(slug);
    const { table } = await loadTable(slug, false);
    const values = sanitiseValues(table.columns, input);
    const full: Record<string, string> = Object.fromEntries(table.columns.map((c) => [c, values[c] ?? ""]));

    if (backend() === "script") {
      try {
        const width = Math.max(...table.columnIndex, 0) + 1;
        const line = Array.from({ length: width }, () => "");
        table.columns.forEach((c, k) => (line[table.columnIndex[k]] = full[c]));
        const out = await scriptCall<{ row: number }>(source, "append", { headerRow: table.headerRow, line });
        invalidate(slug);
        return { id: `r${out.row}`, values: full };
      } catch (err) {
        throw liveWriteError(err);
      }
    }

    if (backend() === "api") {
      try {
        const client = await apiClient();
        const title = await resolveTabTitle(source);
        const width = Math.max(...table.columnIndex, 0) + 1;
        const line = Array.from({ length: width }, () => "");
        table.columns.forEach((c, k) => (line[table.columnIndex[k]] = full[c]));
        const res = await client.spreadsheets.values.append({
          spreadsheetId: source.documentId,
          range: `${quoteTab(title)}!A${table.headerRow}`,
          valueInputOption: "RAW",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values: [line] },
        });
        const range = res.data.updates?.updatedRange ?? "";
        const rowNumber = /![A-Z]+(\d+)/.exec(range)?.[1];
        invalidate(slug);
        return { id: rowNumber ? `r${rowNumber}` : `r${table.headerRow + table.rows.length + 1}`, values: full };
      } catch (err) {
        throw liveWriteError(err);
      }
    }

    const row: DataRow = { id: `n-${randomUUID()}`, values: full };
    await updateJson<OverlayStore, void>(OVERLAY, {}, (draft) => {
      (draft[slug] ??= emptyOverlay()).added.push(row);
    });
    return row;
  });
}

export async function updateRecord(
  slug: string,
  rowId: string,
  input: Record<string, unknown>,
): Promise<{ before: DataRow; after: DataRow }> {
  return withWriteLock(slug, async () => {
    const source = requireSource(slug);
    const current = await loadDataset(slug);
    const before = current.rows.find((r) => r.id === rowId);
    if (!before) throw new DataSourceError("ROW_NOT_FOUND", "Baris data tidak ditemukan atau telah berubah. Lakukan sinkronisasi ulang.", 404);
    const patch = sanitiseValues(current.columns, input);
    const after: DataRow = { id: rowId, values: { ...before.values, ...patch } };

    if (backend() === "script") {
      const rowNumber = rowNumberOf(rowId);
      const { table } = await loadTable(slug, false);
      if (!rowNumber) throw new DataSourceError("ROW_NOT_FOUND", "Baris data tidak valid.", 404);
      try {
        const edits = Object.entries(patch).map(([column, value]) => {
          const at = table.columns.indexOf(column);
          if (at === -1) throw new DataSourceError("INVALID_COLUMN", `Kolom "${column}" tidak dikenal pada modul ini.`, 400);
          return { row: rowNumber, col: table.columnIndex[at] + 1, value };
        });
        await scriptCall(source, "cells", { edits });
        invalidate(slug);
        return { before, after };
      } catch (err) {
        throw liveWriteError(err);
      }
    }

    if (backend() === "api") {
      const rowNumber = rowNumberOf(rowId);
      const { table } = await loadTable(slug, false);
      if (!rowNumber) throw new DataSourceError("ROW_NOT_FOUND", "Baris data tidak valid.", 404);
      try {
        const client = await apiClient();
        const title = await resolveTabTitle(source);
        await client.spreadsheets.values.batchUpdate({
          spreadsheetId: source.documentId,
          requestBody: {
            valueInputOption: "RAW",
            data: Object.entries(patch).map(([column, value]) => ({
              range: `${quoteTab(title)}!${columnLetter(table.columnIndex[table.columns.indexOf(column)])}${rowNumber}`,
              values: [[value]],
            })),
          },
        });
        invalidate(slug);
        return { before, after };
      } catch (err) {
        throw liveWriteError(err);
      }
    }

    await updateJson<OverlayStore, void>(OVERLAY, {}, (draft) => {
      const overlay = (draft[slug] ??= emptyOverlay());
      const added = overlay.added.find((r) => r.id === rowId);
      if (added) Object.assign(added.values, patch);
      else overlay.edits[rowId] = { ...(overlay.edits[rowId] ?? {}), ...patch };
    });
    return { before, after };
  });
}

export async function deleteRecord(slug: string, rowId: string): Promise<DataRow> {
  return withWriteLock(slug, async () => {
    const source = requireSource(slug);
    const current = await loadDataset(slug);
    const target = current.rows.find((r) => r.id === rowId);
    if (!target) throw new DataSourceError("ROW_NOT_FOUND", "Baris data tidak ditemukan atau telah dihapus.", 404);

    if (backend() === "script") {
      const rowNumber = rowNumberOf(rowId);
      if (!rowNumber) throw new DataSourceError("ROW_NOT_FOUND", "Baris data tidak valid.", 404);
      try {
        await scriptCall(source, "delete", { row: rowNumber });
        invalidate(slug);
        return target;
      } catch (err) {
        throw liveWriteError(err);
      }
    }

    if (backend() === "api") {
      const rowNumber = rowNumberOf(rowId);
      if (!rowNumber) throw new DataSourceError("ROW_NOT_FOUND", "Baris data tidak valid.", 404);
      try {
        const client = await apiClient();
        await client.spreadsheets.batchUpdate({
          spreadsheetId: source.documentId,
          requestBody: {
            requests: [
              {
                deleteDimension: {
                  range: { sheetId: source.tabId, dimension: "ROWS", startIndex: rowNumber - 1, endIndex: rowNumber },
                },
              },
            ],
          },
        });
        invalidate(slug);
        return target;
      } catch (err) {
        throw liveWriteError(err);
      }
    }

    await updateJson<OverlayStore, void>(OVERLAY, {}, (draft) => {
      const overlay = (draft[slug] ??= emptyOverlay());
      const addedIndex = overlay.added.findIndex((r) => r.id === rowId);
      if (addedIndex !== -1) overlay.added.splice(addedIndex, 1);
      else {
        overlay.deleted.push(rowId);
        delete overlay.edits[rowId];
      }
    });
    return target;
  });
}
