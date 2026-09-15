import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import type { User } from "@/models";
import { AppError, ForbiddenError, RateLimitError, UnauthorizedError, isAppError } from "./errors";
import { logger } from "./logger";
import { checkRateLimit, clientIpFromRequest } from "./rate-limit";
import { getSessionContext } from "./session";

/**
 * Central API route wrapper.
 * - resolves the authenticated user from the session cookie
 * - enforces same-origin for mutating requests (CSRF protection)
 * - applies optional rate limiting
 * - converts errors into the standard response format
 */

export interface ApiContextBase<P = Record<string, string>> {
  req: NextRequest;
  params: P;
  sessionId: string | null;
}

/** auth: "required" (default) - user is guaranteed non-null */
export type ApiContext<P = Record<string, string>> = ApiContextBase<P> & { user: User };

/** auth: "optional" | "none" - user may be null */
export type ApiContextOptional<P = Record<string, string>> = ApiContextBase<P> & { user: User | null };

export interface ApiOptions {
  /** "required" (default) | "optional" | "none" */
  auth?: "required" | "optional" | "none";
  rateLimit?: {
    limit: number;
    windowSeconds: number;
    /** key by "ip" (default) or "user" */
    scope?: "ip" | "user";
  };
}

type RouteHandler<P extends Record<string, string>> = (req: NextRequest, routeCtx?: { params: Promise<P> }) => Promise<Response>;

// Overload 1: default / "required" auth - handler receives a non-null user
export function withApi<P extends Record<string, string> = Record<string, string>>(
  handler: (ctx: ApiContext<P>) => Promise<unknown>,
  options?: Omit<ApiOptions, "auth"> & { auth?: "required" }
): RouteHandler<P>;

// Overload 2: optional / no auth - handler receives User | null
export function withApi<P extends Record<string, string> = Record<string, string>>(
  handler: (ctx: ApiContextOptional<P>) => Promise<unknown>,
  options: Omit<ApiOptions, "auth"> & { auth: "optional" | "none" }
): RouteHandler<P>;

// Implementation (handler receives the resolved session user - see overloads above)
export function withApi<P extends Record<string, string>>(
  handler: (ctx: ApiContextBase<P> & { user: any }) => Promise<unknown>,
  options?: ApiOptions
): RouteHandler<P> {
  const opts: ApiOptions = options ?? {};
  return async (req: NextRequest, routeCtx?: { params: Promise<P> }): Promise<Response> => {
    const startedAt = Date.now();
    const method = req.method;
    const path = req.nextUrl.pathname;

    try {
      // CSRF: browsers always send Origin on cross-site requests.
      if (method !== "GET" && method !== "HEAD") {
        const origin = req.headers.get("origin");
        if (origin) {
          let originHost: string;
          try {
            originHost = new URL(origin).host;
          } catch {
            throw new ForbiddenError("Invalid origin header");
          }
          if (originHost !== req.nextUrl.host) {
            throw new ForbiddenError("Cross-origin request blocked");
          }
        }
      }

      const authMode = opts.auth ?? "required";
      let user: User | null = null;
      let sessionId: string | null = null;
      if (authMode !== "none") {
        const ctx = await getSessionContext();
        user = ctx?.user ?? null;
        sessionId = ctx?.sessionId ?? null;
        if (authMode === "required" && !user) throw new UnauthorizedError();
      }

      if (opts.rateLimit) {
        const scopeKey =
          opts.rateLimit.scope === "user" && user ? `user:${user.id}` : `ip:${clientIpFromRequest(req)}`;
        const result = await checkRateLimit(`${path}:${scopeKey}`, opts.rateLimit.limit, opts.rateLimit.windowSeconds);
        if (!result.allowed) {
          throw new RateLimitError(undefined, result.retryAfterSeconds);
        }
      }

      const params = routeCtx?.params ? await routeCtx.params : ({} as P);
      const result = await handler({ req, params, user, sessionId });

      logger.info("api_request", {
        method,
        path,
        status: 200,
        durationMs: Date.now() - startedAt,
        userId: user?.id ?? null,
      });

      if (result instanceof Response) return result;
      return NextResponse.json({ success: true, data: result ?? null });
    } catch (error) {
      return handleApiError(error, { method, path, startedAt });
    }
  };
}

function handleApiError(error: unknown, meta: { method: string; path: string; startedAt: number }): Response {
  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
    logger.warn("api_validation_error", { ...meta, status: 422, details });
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details } },
      { status: 422 }
    );
  }

  if (isAppError(error)) {
    const level = error.status >= 500 ? "error" : "warn";
    logger[level]("api_error", { ...meta, status: error.status, code: error.code, message: error.message });

    const headers: Record<string, string> = {};
    if (error instanceof RateLimitError && error.retryAfterSeconds) {
      headers["Retry-After"] = String(error.retryAfterSeconds);
    }

    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message, details: error.details ?? undefined } },
      { status: error.status, headers }
    );
  }

  logger.error("api_unhandled_error", { ...meta, status: 500, error });
  return NextResponse.json(
    { success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
    { status: 500 }
  );
}

/** Successful response helpers (standard envelope) */
export function ok<T>(data: T, status = 200): Response {
  return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T): Response {
  return ok(data, 201);
}

export { AppError };
