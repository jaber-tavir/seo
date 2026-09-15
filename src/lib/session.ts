import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS, sessionCookieOptions } from "@/config/auth";
import { generateToken, hashToken } from "./crypto";
import { sessionRepository } from "@/repositories/SessionRepository";
import type { User } from "@/models";

/**
 * Server-side session helpers.
 * The cookie holds a random raw token; MySQL stores only its SHA-256 hash.
 * These helpers are only callable from Server Components / Actions / Route Handlers.
 */

export interface AuthContext {
  user: User;
  sessionId: string;
}

export async function createSessionForUser(
  userId: string,
  ip?: string | null,
  userAgent?: string | null
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await sessionRepository.create({
    user_id: userId,
    token_hash: hashToken(token),
    ip_address: ip ?? null,
    user_agent: userAgent ?? null,
    expires_at: expiresAt,
  });
  return { token, expiresAt };
}

export async function getSessionContext(): Promise<AuthContext | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  const session = await sessionRepository.findValidByTokenHash(hashToken(raw));
  if (!session) return null;
  if (session.user.status !== "active") return null;

  // Sliding "last used" update - not awaited to keep requests fast
  void sessionRepository.touch(session.id);

  return { user: session.user, sessionId: session.id };
}

export async function getCurrentUser(): Promise<User | null> {
  const ctx = await getSessionContext();
  return ctx?.user ?? null;
}

/** Page-level guard: redirects unauthenticated visitors to /login */
export async function requireUser(): Promise<User> {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  return ctx.user;
}

/** Page-level guard for admin-only pages */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!user.isAdmin()) redirect("/dashboard");
  return user;
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, "", { ...sessionCookieOptions(), maxAge: 0 });
}

/** Destroy the session backing the current cookie (if any) */
export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  if (raw) {
    await sessionRepository.deleteByTokenHash(hashToken(raw));
  }
  await clearSessionCookie();
}
