import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { __resetRateLimitMemoryForTests, checkRateLimit } from "@/lib/rate-limit";
import { __resetRedisCacheForTests, disconnectRedis } from "@/config/redis";

/**
 * Fixed-window semantics, identical for the Redis and in-memory paths.
 * Redis is not guaranteed in dev/CI, so these tests exercise the
 * in-memory fallback deterministically.
 */
describe("rate limiter", () => {
  const stamp = Date.now();
  const key = `test:${stamp}`;

  beforeEach(async () => {
    await disconnectRedis();
    __resetRedisCacheForTests();
    __resetRateLimitMemoryForTests();
  });

  afterEach(async () => {
    await disconnectRedis();
    __resetRedisCacheForTests();
  });

  it("allows requests within the limit and blocks beyond it", async () => {
    const k = `${key}:limit3`;
    const first = await checkRateLimit(k, 3, 60);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(2);

    await checkRateLimit(k, 3, 60);
    await checkRateLimit(k, 3, 60);
    const fourth = await checkRateLimit(k, 3, 60);
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
    expect(fourth.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", async () => {
    const a = await checkRateLimit(`${key}:a`, 1, 60);
    const b = await checkRateLimit(`${key}:b`, 1, 60);
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
    const a2 = await checkRateLimit(`${key}:a`, 1, 60);
    expect(a2.allowed).toBe(false);
  });
});
