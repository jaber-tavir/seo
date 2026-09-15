import { clientIpFromRequest, checkRateLimit } from "@/lib/rate-limit";
import { RateLimitError, ValidationError } from "@/lib/errors";
import { created, withApi } from "@/lib/api";
import { authService } from "@/services/AuthService";
import { toSessionUser } from "@/services/AccountService";
import { registerSchema } from "@/validators/auth";

export const POST = withApi(
  async ({ req }) => {
    const ip = clientIpFromRequest(req);
    const rl = await checkRateLimit(`register:${ip}`, 5, 60 * 60);
    if (!rl.allowed) throw new RateLimitError("Too many registration attempts. Try again later.", rl.retryAfterSeconds);

    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError("Invalid registration data", parsed.error.issues);

    const user = await authService.register(parsed.data, {
      ip,
      userAgent: req.headers.get("user-agent"),
    });

    return created({ user: toSessionUser(user), verification_required: !user.email_verified });
  },
  { auth: "none" }
);
