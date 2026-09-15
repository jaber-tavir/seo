import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("hashes and verifies correctly", async () => {
    const hash = await hashPassword("Password123");
    expect(hash).not.toBe("Password123");
    expect(hash.startsWith("$2")).toBe(true);
    expect(await verifyPassword("Password123", hash)).toBe(true);
    expect(await verifyPassword("WrongPassword", hash)).toBe(false);
  });

  it("produces unique hashes for the same password", async () => {
    const a = await hashPassword("Password123");
    const b = await hashPassword("Password123");
    expect(a).not.toBe(b);
  });

  it("never throws on malformed hashes", async () => {
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
  });
});
