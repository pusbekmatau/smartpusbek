import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Minimal durable JSON document store (one file per collection).
 * Writes are serialised per file and committed atomically via rename,
 * so the layer can later be swapped for PostgreSQL/MySQL behind the same API.
 */

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), "data");

const queues = new Map<string, Promise<unknown>>();

function filePath(name: string): string {
  return path.join(DATA_DIR, `${name}.json`);
}

export async function readJson<T>(name: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath(name), "utf8");
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw err;
  }
}

async function writeJson<T>(name: string, value: T): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const target = filePath(name);
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tmp, target);
}

/** Read-modify-write under a per-file lock. Returns whatever `mutate` returns. */
export function updateJson<T, R>(name: string, fallback: T, mutate: (draft: T) => R | Promise<R>): Promise<R> {
  const previous = queues.get(name) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(async () => {
      const draft = await readJson<T>(name, fallback);
      const result = await mutate(draft);
      await writeJson(name, draft);
      return result;
    });
  queues.set(name, next);
  return next;
}
