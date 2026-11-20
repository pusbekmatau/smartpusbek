import "server-only";
import { randomUUID } from "node:crypto";
import { readJson, updateJson } from "./json-store";
import type { AuditAction, AuditEntry, SessionUser } from "./types";

interface AuditCollection {
  entries: AuditEntry[];
}

const COLLECTION = "audit-log";
const MAX_ENTRIES = 10_000;

export async function recordAudit(input: {
  actor: SessionUser | { username: string };
  action: AuditAction;
  module?: string | null;
  summary: string;
  changes?: AuditEntry["changes"];
}): Promise<void> {
  const actor =
    "id" in input.actor
      ? { id: input.actor.id, username: input.actor.username, role: input.actor.role }
      : { id: null, username: input.actor.username, role: null };
  const entry: AuditEntry = {
    id: randomUUID(),
    at: new Date().toISOString(),
    actor,
    action: input.action,
    module: input.module ?? null,
    summary: input.summary,
    ...(input.changes ? { changes: input.changes } : {}),
  };
  try {
    await updateJson<AuditCollection, void>(COLLECTION, { entries: [] }, (draft) => {
      draft.entries.unshift(entry);
      if (draft.entries.length > MAX_ENTRIES) draft.entries.length = MAX_ENTRIES;
    });
  } catch (err) {
    // Audit persistence must never break the primary operation.
    console.error("[audit] failed to persist entry", err);
  }
}

export async function queryAudit(params: {
  action?: string;
  module?: string;
  q?: string;
  limit: number;
  offset: number;
}): Promise<{ total: number; entries: AuditEntry[] }> {
  const { entries } = await readJson<AuditCollection>(COLLECTION, { entries: [] });
  const q = params.q?.trim().toLowerCase();
  const filtered = entries.filter(
    (e) =>
      (!params.action || e.action === params.action) &&
      (!params.module || e.module === params.module) &&
      (!q || e.summary.toLowerCase().includes(q) || e.actor.username.toLowerCase().includes(q)),
  );
  return { total: filtered.length, entries: filtered.slice(params.offset, params.offset + params.limit) };
}
