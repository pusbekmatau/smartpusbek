import type { Role } from "./types";

export type Permission =
  | "data:read"
  | "data:create"
  | "data:update"
  | "data:delete"
  | "data:export"
  | "data:force-sync"
  | "users:manage"
  | "audit:read";

const MATRIX: Record<Role, ReadonlySet<Permission>> = {
  ADMIN: new Set<Permission>([
    "data:read",
    "data:create",
    "data:update",
    "data:delete",
    "data:export",
    "data:force-sync",
    "users:manage",
    "audit:read",
  ]),
  OPERATOR: new Set<Permission>(["data:read", "data:create", "data:update", "data:export"]),
  VIEWER: new Set<Permission>(["data:read", "data:export"]),
};

export const ROLES: readonly Role[] = ["ADMIN", "OPERATOR", "VIEWER"];

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  OPERATOR: "Operator",
  VIEWER: "Viewer",
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  return role ? MATRIX[role].has(permission) : false;
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
