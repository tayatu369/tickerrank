import { createClient as createVercelKv } from "@vercel/kv";
import { createClient as createTcpRedis } from "redis";

let kvUnavailableWarned = false;

/** Resolved lazily: REST-based KV client or TCP Redis adapter when `REDIS_URL` is redis(s). */
let kvResolved: KvBackend | null | undefined;

export type KvBackend = {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, options?: { ex?: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
};

function trimEnv(name: string): string {
  const v = process.env[name];
  return typeof v === "string" ? v.trim() : "";
}

function resolveRestUrlToken(): { url: string; token: string } | null {
  const kvUrl = trimEnv("KV_REST_API_URL");
  const kvToken = trimEnv("KV_REST_API_TOKEN");
  if (kvUrl && kvToken) return { url: kvUrl, token: kvToken };

  const upUrl = trimEnv("UPSTASH_REDIS_REST_URL");
  const upToken = trimEnv("UPSTASH_REDIS_REST_TOKEN");
  if (upUrl && upToken) return { url: upUrl, token: upToken };

  const redisUrl = trimEnv("REDIS_URL");
  if (redisUrl.startsWith("https://")) {
    const token =
      trimEnv("KV_REST_API_TOKEN") ||
      trimEnv("UPSTASH_REDIS_REST_TOKEN") ||
      trimEnv("REDIS_TOKEN");
    if (token) return { url: redisUrl, token };
  }

  return null;
}

function createTcpKvBackend(redisUrl: string): KvBackend {
  let client: ReturnType<typeof createTcpRedis> | null = null;

  async function ensure(): Promise<ReturnType<typeof createTcpRedis>> {
    if (client?.isOpen) return client;
    const c = createTcpRedis({ url: redisUrl });
    await c.connect();
    client = c;
    return c;
  }

  function serialize(value: unknown): string {
    return typeof value === "string" ? value : JSON.stringify(value);
  }

  function deserialize(raw: string): unknown {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return raw;
    }
  }

  return {
    async get(key: string) {
      const c = await ensure();
      const raw = await c.get(key);
      if (raw == null) return null;
      return deserialize(raw);
    },
    async set(key: string, value: unknown, options?: { ex?: number }) {
      const c = await ensure();
      const payload = serialize(value);
      if (options?.ex != null) {
        await c.set(key, payload, { EX: options.ex });
      } else {
        await c.set(key, payload);
      }
      return "OK";
    },
    async del(key: string) {
      const c = await ensure();
      return c.del(key);
    },
    async incr(key: string) {
      const c = await ensure();
      return c.incr(key);
    },
    async decr(key: string) {
      const c = await ensure();
      return c.decr(key);
    },
  };
}

function getKvBackend(): KvBackend | null {
  if (kvResolved !== undefined) return kvResolved;

  const rest = resolveRestUrlToken();
  if (rest) {
    kvResolved = createVercelKv({ url: rest.url, token: rest.token });
    return kvResolved;
  }

  const redisUrl = trimEnv("REDIS_URL");
  if (/^rediss?:\/\//i.test(redisUrl)) {
    kvResolved = createTcpKvBackend(redisUrl);
    return kvResolved;
  }

  kvResolved = null;
  return null;
}

function kvErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** True when KV is not configured, unreachable, or misconfigured in a way that should not break the app. */
export function isKvUnavailableError(err: unknown): boolean {
  const msg = kvErrorMessage(err);
  return (
    /KV_REST_API_URL|KV_REST_API_TOKEN|KV_URL|KV_REST_API_READ_ONLY_TOKEN|VERCEL_KV|REDIS_URL/i.test(
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
    "[kv] Vercel KV / Redis is not configured or unreachable; cache and refresh rate limits are disabled (typical for local dev).",
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
  const kv = getKvBackend();
  if (!kv) {
    warnKvUnavailableOnce();
    return null;
  }
  try {
    const v = await kv.get(key);
    return v as T | null;
  } catch (err) {
    handleKvFailure(err, `get(${JSON.stringify(key)})`);
    return null;
  }
}

/** Returns whether the value was stored successfully. */
export async function kvSetSafe(
  key: string,
  value: unknown,
  options?: { ex: number },
): Promise<boolean> {
  const kv = getKvBackend();
  if (!kv) {
    warnKvUnavailableOnce();
    return false;
  }
  try {
    if (options?.ex != null) {
      await kv.set(key, value as never, { ex: options.ex });
    } else {
      await kv.set(key, value as never);
    }
    return true;
  } catch (err) {
    handleKvFailure(err, `set(${JSON.stringify(key)})`);
    return false;
  }
}

export async function kvDelSafe(key: string): Promise<void> {
  const kv = getKvBackend();
  if (!kv) {
    warnKvUnavailableOnce();
    return;
  }
  try {
    await kv.del(key);
  } catch (err) {
    handleKvFailure(err, `del(${JSON.stringify(key)})`);
  }
}

/** `null` means KV is unavailable — skip rate limiting (unlimited refreshes). */
export async function kvIncrSafe(key: string): Promise<number | null> {
  const kv = getKvBackend();
  if (!kv) {
    warnKvUnavailableOnce();
    return null;
  }
  try {
    return await kv.incr(key);
  } catch (err) {
    handleKvFailure(err, `incr(${JSON.stringify(key)})`);
    return null;
  }
}

export async function kvDecrSafe(key: string): Promise<void> {
  const kv = getKvBackend();
  if (!kv) {
    warnKvUnavailableOnce();
    return;
  }
  try {
    await kv.decr(key);
  } catch (err) {
    handleKvFailure(err, `decr(${JSON.stringify(key)})`);
  }
}
