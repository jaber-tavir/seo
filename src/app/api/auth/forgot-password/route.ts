import { ok, withApi } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import { authService } from "@/services/AuthService";
import { forgotPasswordSchema } from "@/validators/auth";

export const POST = withApi(
  async ({ req }) => {
    const body = await req.json().catch(() => null);
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError("Invalid email", parsed.error.issues);

    await authService.forgotPassword(parsed.data.email);

    // Always the same response - no account enumeration
    return ok({ message: "If that email exists, a password reset link has been sent." });
  },
  { auth: "none", rateLimit: { limit: 3, windowSeconds: 60 * 60, scope: "ip" } }
);
