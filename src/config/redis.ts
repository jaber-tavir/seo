import Redis from "ioredis";
import { env } from "./env";
import { logger } from "@/lib/logger";

/**
 * Redis is used for BullMQ queues, caching, rate limiting and job progress.
 * The application degrades gracefully to in-memory handling when Redis is
 * unavailable (e.g. local dev without Redis), so the app never hard-crashes.
 */

const REDIS_KEY_PREFIX = "seo:";

let redisClient: Redis | null = null;
let redisDisabled = false;

export function getRedis(): Redis | null {
  if (redisDisabled) return null;
  if (redisClient) return redisClient;

  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      connectTimeout: 3000,
      retryStrategy(times) {
        if (times > 5) {
          redisDisabled = true;
          logger.warn("Redis unreachable after retries - disabling Redis features for this process");
          return null;
        }
        return Math.min(times * 500, 3000);
      },
    });

    redisClient.on("error", (err: Error) => {
      logger.warn("Redis error", { error: err.message });
    });

    return redisClient;
  } catch (err) {
    redisDisabled = true;
    logger.warn("Failed to initialize Redis - continuing without Redis", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export function __resetRedisCacheForTests(): void {
  redisClient = null;
  redisDisabled = false;
}

export async function isRedisAvailable(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    const result = await redis.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}

export function redisKey(...parts: string[]): string {
  return `${REDIS_KEY_PREFIX}${parts.join(":")}`;
}

// ------------------------------------------------------------------ Cache

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(redisKey(key));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(redisKey(key), JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // cache write failures are non-fatal
  }
}

export async function cacheDelete(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(redisKey(key));
  } catch {
    // ignore
  }
}

export async function cacheDeletePattern(pattern: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    const full = `${redisKey(pattern)}*`;
    const keys = await redis.keys(full);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // ignore
  }
}

// ------------------------------------------------------------------ Generic cached wrapper

export async function cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;
  const value = await loader();
  await cacheSet(key, value, ttlSeconds);
  return value;
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit().catch(() => undefined);
    redisClient = null;
  }
}
