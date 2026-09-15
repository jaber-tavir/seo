import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { OAUTH_STATE_COOKIE_NAME } from "@/config/auth";
import { generateToken } from "@/lib/crypto";

export const dynamic = "force-dynamic";

/** Starts the Google OAuth flow */
export async function GET(req: Request): Promise<Response> {
  if (!env.googleOAuthEnabled) {
    return NextResponse.redirect(new URL("/login?error=google_disabled", req.url));
  }

  const state = generateToken(16);
  const redirectUri = `${env.APP_URL.replace(/\/$/, "")}/api/auth/google/callback`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID!);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });
  return response;
}
