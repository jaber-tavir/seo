import { ok, withApi } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import { authService } from "@/services/AuthService";
import { passwordChangeSchema } from "@/validators/auth";

export const PATCH = withApi(async ({ req, user, sessionId }) => {
  const body = await req.json().catch(() => null);
  const parsed = passwordChangeSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError("Invalid password change request", parsed.error.issues);

  await authService.changePassword(user, parsed.data.current_password, parsed.data.new_password, sessionId);
  return ok({ message: "Password updated. Other sessions have been signed out." });
});
