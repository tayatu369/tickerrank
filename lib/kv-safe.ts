import { kv } from "@vercel/kv";

let kvUnavailableWarned = false;

function kvErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** True when KV is not configured, unreachable, or misconfigured in a way that should not break the app. */
export function isKvUnavailableError(err: unknown): boolean {
  const msg = kvErrorMessage(err);
  return (
    /KV_REST_API_URL|KV_REST_API_TOKEN|KV_URL|KV_REST_API_READ_ONLY_TOKEN|VERCEL_KV/i.test(
      msg,
    ) ||
    /missing required environment|Missing required environment|required environment variables/i.test(
      msg,
    ) ||
    /@vercel\/kv/i.test(msg) ||
    /Upstash|could not connect|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|fetch failed|Load failed|network.*redis|redis.*unavailable/i.test(
      msg,
    ) ||
    /not configured/i.test(msg)
  );
}

export function warnKvUnavailableOnce(): void {
  if (kvUnavailableWarned) return;
  kvUnavailableWarned = true;
  console.warn(
    "[kv] Vercel KV is not configured or unreachable; cache and refresh rate limits are disabled (typical for local dev).",
  );
}

function handleKvFailure(err: unknown, context: string): void {
  if (isKvUnavailableError(err)) {
    warnKvUnavailableOnce();
    return;
  }
  console.error(`[kv] ${context}`, err);
}

export async function kvGetSafe<T = unknown>(key: string): Promise<T | null> {
  try {
    const v = await kv.get(key);
    return v as T | null;
  } catch (err) {
    handleKvFailure(err, `get(${JSON.stringify(key)})`);
    return null;
  }
}

export async function kvSetSafe(
  key: string,
  value: unknown,
  options?: { ex: number },
): Promise<void> {
  try {
    if (options?.ex != null) {
      await kv.set(key, value as never, { ex: options.ex });
    } else {
      await kv.set(key, value as never);
    }
  } catch (err) {
    handleKvFailure(err, `set(${JSON.stringify(key)})`);
  }
}

export async function kvDelSafe(key: string): Promise<void> {
  try {
    await kv.del(key);
  } catch (err) {
    handleKvFailure(err, `del(${JSON.stringify(key)})`);
  }
}

/** `null` means KV is unavailable — skip rate limiting (unlimited refreshes). */
export async function kvIncrSafe(key: string): Promise<number | null> {
  try {
    return await kv.incr(key);
  } catch (err) {
    handleKvFailure(err, `incr(${JSON.stringify(key)})`);
    return null;
  }
}

export async function kvDecrSafe(key: string): Promise<void> {
  try {
    await kv.decr(key);
  } catch (err) {
    handleKvFailure(err, `decr(${JSON.stringify(key)})`);
  }
}
