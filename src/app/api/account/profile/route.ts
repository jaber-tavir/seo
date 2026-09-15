import { ok, withApi } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import { accountService, toSessionUser } from "@/services/AccountService";
import { profileSchema } from "@/validators/auth";

export const PATCH = withApi(async ({ req, user }) => {
  const body = await req.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError("Invalid profile data", parsed.error.issues);

  const updated = await accountService.updateProfile(user, parsed.data);
  return ok({ user: toSessionUser(updated) });
});
