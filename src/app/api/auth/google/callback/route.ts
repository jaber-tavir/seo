import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { OAUTH_STATE_COOKIE_NAME } from "@/config/auth";
import { safeEqual } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import { authService } from "@/services/AuthService";
import type { GoogleUserInfo } from "@/types";

export const dynamic = "force-dynamic";

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

/** Handles the Google OAuth callback */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = readCookie(req, OAUTH_STATE_COOKIE_NAME);

  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, req.url));

  if (!code || !state || !cookieState || !safeEqual(state, cookieState)) {
    return fail("oauth_state");
  }
  if (!env.googleOAuthEnabled) return fail("google_disabled");

  try {
    const redirectUri = `${env.APP_URL.replace(/\/$/, "")}/api/auth/google/callback`;

    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) {
      logger.error("google_token_exchange_failed", { status: tokenRes.status });
      return fail("google_failed");
    }
    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) return fail("google_failed");

    // Fetch userinfo
    const userinfoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!userinfoRes.ok) {
      logger.error("google_userinfo_failed", { status: userinfoRes.status });
      return fail("google_failed");
    }
    const profile = (await userinfoRes.json()) as GoogleUserInfo;
    if (!profile.email) return fail("google_failed");

    await authService.googleUpsert(profile, {
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip"),
      userAgent: req.headers.get("user-agent"),
    });

    const response = NextResponse.redirect(new URL("/dashboard", req.url));
    response.cookies.set(OAUTH_STATE_COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return response;
  } catch (err) {
    logger.error("google_oauth_error", { error: err });
    return fail("google_failed");
  }
}
