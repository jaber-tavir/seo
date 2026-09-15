import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Token generation & hashing.
 * Raw tokens are only ever shown once (or stored in the user's cookie);
 * the database stores SHA-256 hashes.
 */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time string comparison */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
