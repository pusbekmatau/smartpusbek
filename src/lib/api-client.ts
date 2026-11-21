import { API_URL, withBase } from "./config";
import { buildOverview, buildSimmatTrend, type DatasetLoader } from "./overview";
import { clearSession, readSession, saveSession } from "./session-client";
import type { DatasetResponse, SessionUser } from "./types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const NETWORK_MESSAGE = "Tidak dapat menjangkau server. Periksa koneksi jaringan Anda.";
const NOT_CONFIGURED_MESSAGE =
  "Alamat server (Google Apps Script) belum diatur pada situs ini. Atur variabel APPS_SCRIPT_URL di GitHub lalu bangun ulang situs.";
const BAD_RESPONSE_MESSAGE =
  "Server mengembalikan respons yang tidak dapat dibaca. Pastikan Web App Apps Script sudah di-deploy dengan akses “Siapa saja”.";

interface RpcEnvelope {
  ok: boolean;
  data?: unknown;
  error?: { status?: number; code?: string; message?: string };
}

/**
 * One round trip to the Apps Script backend. The body is sent as text/plain so the browser
 * treats it as a "simple" cross-origin request (Apps Script cannot answer CORS preflights).
 */
async function rpc<T>(
  method: string,
  path: string,
  query: Record<string, string>,
  body: unknown,
  signal?: AbortSignal | null,
): Promise<T> {
  if (!API_URL) throw new ApiError(0, "NOT_CONFIGURED", NOT_CONFIGURED_MESSAGE);

  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ method, path, query, body, token: readSession()?.token ?? null }),
      redirect: "follow",
      credentials: "omit",
      cache: "no-store",
      signal: signal ?? undefined,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, "NETWORK", NETWORK_MESSAGE);
  }

  const envelope = (await res.json().catch(() => null)) as RpcEnvelope | null;
  if (!envelope || typeof envelope.ok !== "boolean") throw new ApiError(502, "BAD_RESPONSE", BAD_RESPONSE_MESSAGE);

  if (!envelope.ok) {
    const status = envelope.error?.status ?? 500;
    if (status === 401 && path !== "/api/auth/login" && typeof window !== "undefined") {
      clearSession();
      window.location.assign(withBase(`/login?next=${encodeURIComponent(window.location.pathname.replace(withBase(""), "") || "/dashboard")}`));
    }
    throw new ApiError(status, envelope.error?.code ?? "UNKNOWN", envelope.error?.message ?? "Permintaan tidak dapat diproses.");
  }
  return envelope.data as T;
}

// ---------------------------------------------------------------------------
// Client-side dataset cache (the server keeps its own, this just avoids round trips
// when moving between modules and the overview).
// ---------------------------------------------------------------------------

const DATASET_TTL_MS = 5 * 60 * 1000;
const datasetCache = new Map<string, { at: number; data: DatasetResponse }>();

const loadForAggregates: DatasetLoader = async (slug, force) => {
  try {
    const res = await apiFetch<DatasetResponse>(`/api/database/${slug}${force ? "?refresh=1&quiet=1" : ""}`);
    return { slug, columns: res.columns, rows: res.rows, syncedAt: res.meta.syncedAt, mode: res.meta.mode };
  } catch {
    return null;
  }
};

/**
 * Typed wrapper with the same call signature the UI has always used. Requests for
 * `/api/...` are forwarded to the Apps Script backend; the overview aggregates are
 * computed in the browser from the individual module datasets.
 */
export async function apiFetch<T>(input: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const url = new URL(input, "http://local");
  const path = url.pathname.replace(/\/+$/, "");
  const query = Object.fromEntries(url.searchParams.entries());
  const refresh = query.refresh === "1";
  const signal = init?.signal;

  if (method === "GET" && path === "/api/overview") {
    if (refresh) await rpc("POST", "/api/system/sync", {}, null, signal).catch(() => undefined);
    return (await buildOverview(loadForAggregates, refresh)) as T;
  }
  if (method === "GET" && path === "/api/overview/simmat") {
    return (await buildSimmatTrend(loadForAggregates, refresh)) as T;
  }

  const dataset = /^\/api\/database\/([^/]+)$/.exec(path);
  if (dataset) {
    const slug = decodeURIComponent(dataset[1]);
    if (method === "GET") {
      const hit = datasetCache.get(slug);
      if (!refresh && hit && Date.now() - hit.at < DATASET_TTL_MS) return hit.data as T;
      const data = await rpc<DatasetResponse>(method, path, query, init?.json, signal);
      datasetCache.set(slug, { at: Date.now(), data });
      return data as T;
    }
    const result = await rpc<T>(method, path, query, init?.json, signal);
    datasetCache.delete(slug);
    return result;
  }

  if (method === "POST" && path === "/api/auth/login") {
    const result = await rpc<{ user: SessionUser; token: string; expiresAt: number }>(method, path, query, init?.json, signal);
    saveSession({ token: result.token, user: result.user, exp: result.expiresAt });
    datasetCache.clear();
    return { user: result.user } as T;
  }

  if (method === "POST" && path === "/api/auth/logout") {
    try {
      return await rpc<T>(method, path, query, init?.json, signal);
    } finally {
      clearSession();
      datasetCache.clear();
    }
  }

  return rpc<T>(method, path, query, init?.json, signal);
}
