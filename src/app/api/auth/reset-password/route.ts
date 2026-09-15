import { ok, withApi } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import { authService } from "@/services/AuthService";
import { resetPasswordSchema } from "@/validators/auth";

export const POST = withApi(
  async ({ req }) => {
    const body = await req.json().catch(() => null);
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError("Invalid reset request", parsed.error.issues);

    await authService.resetPassword(parsed.data.token, parsed.data.password);

    return ok({ message: "Your password has been reset. You can now sign in." });
  },
  { auth: "none", rateLimit: { limit: 5, windowSeconds: 60 * 60, scope: "ip" } }
);
