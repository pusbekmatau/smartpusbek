import type { ApiErrorBody } from "./types";

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

/** Typed fetch wrapper for the internal API; throws `ApiError` with a user-facing message. */
export async function apiFetch<T>(input: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  let res: Response;
  try {
    res = await fetch(input, {
      ...rest,
      headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...rest.headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "NETWORK", NETWORK_MESSAGE);
  }
  const body = (await res.json().catch(() => null)) as (T & Partial<ApiErrorBody>) | null;
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !input.startsWith("/api/auth/login")) {
      window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    }
    throw new ApiError(res.status, body?.error?.code ?? "UNKNOWN", body?.error?.message ?? "Permintaan tidak dapat diproses.");
  }
  return body as T;
}
