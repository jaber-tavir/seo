import { env } from "./env";

/** Cookie names */
export const SESSION_COOKIE_NAME = "seo_session";
export const OAUTH_STATE_COOKIE_NAME = "seo_oauth_state";

/** Session lifetime in seconds */
export const SESSION_TTL_SECONDS = env.AUTH_SESSION_TTL_DAYS * 24 * 60 * 60;

/** Shared cookie options for the session cookie */
export function sessionCookieOptions(maxAgeSeconds: number = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
