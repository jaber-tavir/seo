import { clientIpFromRequest } from "@/lib/rate-limit";
import { ValidationError } from "@/lib/errors";
import { ok, withApi } from "@/lib/api";
import { createSessionForUser, setSessionCookie } from "@/lib/session";
import { authService } from "@/services/AuthService";
import { toSessionUser } from "@/services/AccountService";
import { verifyEmailSchema } from "@/validators/auth";

export const POST = withApi(
  async ({ req }) => {
    const body = await req.json().catch(() => null);
    const parsed = verifyEmailSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError("Invalid verification token", parsed.error.issues);

    const user = await authService.verifyEmail(parsed.data.token);

    // Auto-login after successful verification
    const { token } = await createSessionForUser(user.id, clientIpFromRequest(req), req.headers.get("user-agent"));
    await setSessionCookie(token);

    return ok({ user: toSessionUser(user) });
  },
  { auth: "none", rateLimit: { limit: 10, windowSeconds: 60 * 60, scope: "ip" } }
);
