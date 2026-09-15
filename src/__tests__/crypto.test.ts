import { describe, expect, it } from "vitest";
import { generateToken, hashToken, safeEqual } from "@/lib/crypto";

describe("crypto helpers", () => {
  it("generates url-safe random tokens", () => {
    const token = generateToken(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(generateToken(32)).not.toBe(token);
  });

  it("hashes tokens deterministically (sha256 hex)", () => {
    expect(hashToken("abc")).toHaveLength(64);
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });

  it("compares strings in constant time", () => {
    expect(safeEqual(hashToken("a"), hashToken("a"))).toBe(true);
    expect(safeEqual(hashToken("a"), hashToken("b"))).toBe(false);
    expect(safeEqual("short", "longer-string")).toBe(false);
  });
});
