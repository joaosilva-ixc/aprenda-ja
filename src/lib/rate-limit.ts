import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitResult = { ok: boolean; retryAfterSec: number };

type MemoryBucket = { count: number; resetAt: number };

const memoryBuckets = new Map<string, MemoryBucket>();
const MAX_BUCKETS = 10_000;

const ratelimiters = new Map<
  string,
  { limiter: Ratelimit; windowMs: number } | null
>();

function cleanupMemory(now: number) {
  if (memoryBuckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of memoryBuckets) {
    if (bucket.resetAt <= now) memoryBuckets.delete(key);
  }
}

function getUpstashLimiter(
  limit: number,
  windowMs: number,
): { limiter: Ratelimit; windowMs: number } | null {
  const cacheKey = `${limit}:${windowMs}`;
  if (ratelimiters.has(cacheKey)) return ratelimiters.get(cacheKey) ?? null;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  let instance: { limiter: Ratelimit; windowMs: number } | null = null;

  if (url && token) {
    instance = {
      limiter: new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
        prefix: "aprendaja",
      }),
      windowMs,
    };
  }
  ratelimiters.set(cacheKey, instance);
  return instance;
}

export async function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): Promise<RateLimitResult> {
  const distributed = getUpstashLimiter(limit, windowMs);
  if (distributed) {
    try {
      const { success, reset } = await distributed.limiter.limit(key);
      return {
        ok: success,
        retryAfterSec: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
      };
    } catch (err) {
      console.error("Rate limit distribuído indisponível, usando memória:", err);
    }
  }

  const now = Date.now();
  cleanupMemory(now);

  const bucket = memoryBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { ok: true, retryAfterSec: 0 };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
