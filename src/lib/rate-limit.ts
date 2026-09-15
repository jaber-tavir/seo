import type { NextRequest } from "next/server";
import { disconnectRedis, getRedis, redisKey } from "@/config/redis";
import { logger } from "./logger";

/**
 * Fixed-window rate limiter.
 * Backed by Redis when available, with a safe in-memory fallback per process.
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

// Periodic cleanup so the fallback map cannot grow unbounded
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function memoryCheck(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();

  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    lastCleanup = now;
    for (const [k, bucket] of memoryBuckets) {
      if (bucket.resetAt < now) memoryBuckets.delete(k);
    }
  }

  const existing = memoryBuckets.get(key);
  if (!existing || existing.resetAt < now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, limit, remaining: limit - 1, retryAfterSeconds: windowSeconds };
  }

  existing.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  return {
    allowed: existing.count <= limit,
    limit,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds,
  };
}

export function __resetRateLimitMemoryForTests(): void {
  memoryBuckets.clear();
  lastCleanup = Date.now();
}

export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const redis = getRedis();
  if (redis) {
    try {
      const bucketKey = redisKey("rl", key);
      const count = await redis.incr(bucketKey);
      if (count === 1) {
        await redis.expire(bucketKey, windowSeconds);
      }
      const ttl = await redis.ttl(bucketKey);
      return {
        allowed: count <= limit,
        limit,
        remaining: Math.max(0, limit - count),
        retryAfterSeconds: ttl > 0 ? ttl : windowSeconds,
      };
    } catch (err) {
      logger.warn("Rate limiter falling back to in-memory", { error: err instanceof Error ? err.message : String(err) });
      // IMPORTANT: disconnect the broken client so subsequent checks in this
      // process go straight to the in-memory bucket (same semantics).
      await disconnectRedis();
    }
  }

  return memoryCheck(key, limit, windowSeconds);
}

/** Extract the client IP from proxy-aware headers */
export function clientIpFromRequest(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}
