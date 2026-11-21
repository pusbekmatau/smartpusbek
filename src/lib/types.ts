/** Shared contracts between API routes and the client. */

export type Role = "ADMIN" | "OPERATOR" | "VIEWER";

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  role: Role;
}

export interface PublicUser extends SessionUser {
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export type ConnectorMode = "live" | "local";

export interface DataRow {
  id: string;
  values: Record<string, string>;
}

/** Dataset as consumed by the client-side aggregators (overview, SIMMAT trend). */
export interface Dataset {
  slug: string;
  columns: string[];
  rows: DataRow[];
  syncedAt: string;
  mode: ConnectorMode;
}

export interface DatasetMeta {
  mode: ConnectorMode;
  syncedAt: string;
  cached: boolean;
  rowCount: number;
}

export interface DatasetResponse {
  slug: string;
  title: string;
  columns: string[];
  rows: DataRow[];
  meta: DatasetMeta;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "LOGIN_FAILED"
  | "RECORD_CREATE"
  | "RECORD_UPDATE"
  | "RECORD_DELETE"
  | "FORCE_SYNC"
  | "USER_CREATE"
  | "USER_UPDATE"
  | "USER_DELETE";

export interface AuditEntry {
  id: string;
  at: string;
  actor: { id: string | null; username: string; role: Role | null };
  action: AuditAction;
  module: string | null;
  summary: string;
  changes?: Record<string, { before: string | null; after: string | null }>;
}

export interface ModuleOverview {
  slug: string;
  title: string;
  group: string;
  status: "ok" | "error";
  records: number;
  columns: number;
  syncedAt: string | null;
}

export interface SeriesPoint {
  label: string;
  value: number;
}

import type { ExecutiveSummary } from "./executive";

export interface OverviewResponse {
  generatedAt: string;
  mode: ConnectorMode;
  totals: { modules: number; available: number; records: number; fields: number };
  groups: { id: string; label: string; records: number; modules: number }[];
  modules: ModuleOverview[];
  simmat: { year: number; slug: string; records: number; status: "ok" | "error"; growth: number | null }[];
  monitoring: {
    y2025: { records: number; status: "ok" | "error" };
    y2026: { records: number; status: "ok" | "error" };
    dimension: string | null;
    comparison: { label: string; y2025: number; y2026: number }[];
  };
  highlights: { slug: string; title: string; column: string; total: number; average: number }[];
  executive: ExecutiveSummary;
}

export interface SystemStatus {
  mode: ConnectorMode;
  serverTime: string;
  cacheTtlSeconds: number;
}
