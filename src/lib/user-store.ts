import "server-only";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { readJson, updateJson } from "./json-store";
import type { PublicUser, Role, SessionUser } from "./types";

interface StoredUser extends PublicUser {
  passwordHash: string;
}

interface UserCollection {
  users: StoredUser[];
}

const COLLECTION = "users";
const BCRYPT_ROUNDS = 11;

/** Default accounts seeded on first boot. Passwords can be overridden via env. */
const SEED_ACCOUNTS: { username: string; name: string; role: Role; env: string; fallback: string }[] = [
  { username: "admin", name: "Administrator Sistem", role: "ADMIN", env: "SEED_ADMIN_PASSWORD", fallback: "Admin@Pusbek2026" },
  { username: "operator", name: "Operator Data", role: "OPERATOR", env: "SEED_OPERATOR_PASSWORD", fallback: "Operator@Pusbek2026" },
  { username: "viewer", name: "Pengamat Eksekutif", role: "VIEWER", env: "SEED_VIEWER_PASSWORD", fallback: "Viewer@Pusbek2026" },
];

export class UserStoreError extends Error {
  constructor(
    public readonly code: "DUPLICATE" | "NOT_FOUND" | "LAST_ADMIN" | "SELF_ACTION",
    message: string,
  ) {
    super(message);
  }
}

function toPublic(user: StoredUser): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...rest } = user;
  return rest;
}

export function toSessionUser(user: PublicUser): SessionUser {
  return { id: user.id, username: user.username, name: user.name, role: user.role };
}

let seeded: Promise<void> | null = null;

function ensureSeeded(): Promise<void> {
  seeded ??= updateJson<UserCollection, void>(COLLECTION, { users: [] }, async (draft) => {
    if (draft.users.length > 0) return;
    const now = new Date().toISOString();
    for (const seed of SEED_ACCOUNTS) {
      draft.users.push({
        id: randomUUID(),
        username: seed.username,
        name: seed.name,
        role: seed.role,
        active: true,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null,
        passwordHash: await bcrypt.hash(process.env[seed.env] || seed.fallback, BCRYPT_ROUNDS),
      });
    }
  }).catch((err) => {
    seeded = null;
    throw err;
  });
  return seeded;
}

async function loadUsers(): Promise<StoredUser[]> {
  await ensureSeeded();
  return (await readJson<UserCollection>(COLLECTION, { users: [] })).users;
}

export async function listUsers(): Promise<PublicUser[]> {
  return (await loadUsers()).map(toPublic);
}

export async function findUserById(id: string): Promise<PublicUser | null> {
  const user = (await loadUsers()).find((u) => u.id === id);
  return user ? toPublic(user) : null;
}

let dummyHash: Promise<string> | null = null;

/** Constant-time-ish credential check: always runs bcrypt even for unknown users. */
export async function verifyCredentials(identifier: string, password: string): Promise<PublicUser | null> {
  const needle = identifier.trim().toLowerCase();
  const user = (await loadUsers()).find((u) => u.username.toLowerCase() === needle);
  dummyHash ??= bcrypt.hash("timing-equaliser", BCRYPT_ROUNDS);
  const ok = await bcrypt.compare(password, user?.passwordHash ?? (await dummyHash));
  if (!user || !ok || !user.active) return null;
  await updateJson<UserCollection, void>(COLLECTION, { users: [] }, (draft) => {
    const target = draft.users.find((u) => u.id === user.id);
    if (target) target.lastLoginAt = new Date().toISOString();
  });
  return toPublic(user);
}

function activeAdminCount(users: StoredUser[]): number {
  return users.filter((u) => u.role === "ADMIN" && u.active).length;
}

export async function createUser(input: { username: string; name: string; role: Role; password: string }): Promise<PublicUser> {
  await ensureSeeded();
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  return updateJson<UserCollection, PublicUser>(COLLECTION, { users: [] }, (draft) => {
    const username = input.username.trim().toLowerCase();
    if (draft.users.some((u) => u.username.toLowerCase() === username)) {
      throw new UserStoreError("DUPLICATE", "Nama pengguna telah terdaftar.");
    }
    const now = new Date().toISOString();
    const user: StoredUser = {
      id: randomUUID(),
      username,
      name: input.name.trim(),
      role: input.role,
      active: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
      passwordHash,
    };
    draft.users.push(user);
    return toPublic(user);
  });
}

export async function updateUser(
  actorId: string,
  id: string,
  patch: { name?: string; role?: Role; active?: boolean; password?: string },
): Promise<{ before: PublicUser; after: PublicUser }> {
  await ensureSeeded();
  const passwordHash = patch.password ? await bcrypt.hash(patch.password, BCRYPT_ROUNDS) : null;
  return updateJson<UserCollection, { before: PublicUser; after: PublicUser }>(COLLECTION, { users: [] }, (draft) => {
    const user = draft.users.find((u) => u.id === id);
    if (!user) throw new UserStoreError("NOT_FOUND", "Akun tidak ditemukan.");
    const before = toPublic(user);
    const demotes = (patch.role && patch.role !== "ADMIN") || patch.active === false;
    if (user.role === "ADMIN" && user.active && demotes && activeAdminCount(draft.users) <= 1) {
      throw new UserStoreError("LAST_ADMIN", "Minimal harus tersisa satu Administrator aktif.");
    }
    if (id === actorId && patch.active === false) {
      throw new UserStoreError("SELF_ACTION", "Anda tidak dapat menonaktifkan akun Anda sendiri.");
    }
    if (patch.name !== undefined) user.name = patch.name.trim();
    if (patch.role !== undefined) user.role = patch.role;
    if (patch.active !== undefined) user.active = patch.active;
    if (passwordHash) user.passwordHash = passwordHash;
    user.updatedAt = new Date().toISOString();
    return { before, after: toPublic(user) };
  });
}

export async function deleteUser(actorId: string, id: string): Promise<PublicUser> {
  await ensureSeeded();
  return updateJson<UserCollection, PublicUser>(COLLECTION, { users: [] }, (draft) => {
    const index = draft.users.findIndex((u) => u.id === id);
    if (index === -1) throw new UserStoreError("NOT_FOUND", "Akun tidak ditemukan.");
    if (id === actorId) throw new UserStoreError("SELF_ACTION", "Anda tidak dapat menghapus akun Anda sendiri.");
    const [removed] = draft.users.splice(index, 1);
    if (removed.role === "ADMIN" && removed.active && activeAdminCount(draft.users) < 1) {
      throw new UserStoreError("LAST_ADMIN", "Minimal harus tersisa satu Administrator aktif.");
    }
    return toPublic(removed);
  });
}
