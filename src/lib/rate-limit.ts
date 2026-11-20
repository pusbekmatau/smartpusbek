import "server-only";

/**
 * In-memory sliding window limiter for login attempts.
 * Suitable for a single instance; replace with Redis for multi-instance deployments.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES = 5;

const failures = new Map<string, number[]>();

function recent(key: string, now: number): number[] {
  const list = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length) failures.set(key, list);
  else failures.delete(key);
  return list;
}

export function loginBlockedFor(key: string): number {
  const now = Date.now();
  const list = recent(key, now);
  if (list.length < MAX_FAILURES) return 0;
  return Math.ceil((WINDOW_MS - (now - list[0])) / 1000);
}

export function registerLoginFailure(key: string): void {
  const now = Date.now();
  failures.set(key, [...recent(key, now), now]);
}

export function clearLoginFailures(key: string): void {
  failures.delete(key);
}
