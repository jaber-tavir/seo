import { ok, withApi } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import { accountService } from "@/services/AccountService";

export const dynamic = "force-dynamic";

export const GET = withApi(async ({ user, sessionId }) => {
  const sessions = await accountService.listSessions(user, sessionId);
  return ok({ sessions });
});

export const DELETE = withApi(async ({ req, user, sessionId }) => {
  const body = await req.json().catch(() => null);
  const parsed = (body ?? {}) as { id?: string; all_others?: boolean };

  if (parsed.all_others === true) {
    if (!sessionId) throw new ValidationError("No active session");
    await accountService.revokeOtherSessions(user, sessionId);
    return ok({ revoked: "all_others" });
  }
  if (!parsed.id) throw new ValidationError("Provide a session id or all_others=true");

  await accountService.revokeSession(user, parsed.id);
  return ok({ revoked: parsed.id });
});
