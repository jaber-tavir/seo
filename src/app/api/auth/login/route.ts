import { clientIpFromRequest } from "@/lib/rate-limit";
import { ValidationError } from "@/lib/errors";
import { ok, withApi } from "@/lib/api";
import { authService } from "@/services/AuthService";
import { toSessionUser } from "@/services/AccountService";
import { loginSchema } from "@/validators/auth";

export const POST = withApi(
  async ({ req }) => {
    const body = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError("Invalid credentials", parsed.error.issues);

    const user = await authService.login(parsed.data, {
      ip: clientIpFromRequest(req),
      userAgent: req.headers.get("user-agent"),
    });

    return ok({ user: toSessionUser(user) });
  },
  { auth: "none", rateLimit: { limit: 10, windowSeconds: 15 * 60, scope: "ip" } }
);
