import { ok, withApi } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import { notificationService } from "@/services/NotificationService";

export const POST = withApi(async ({ req, user }) => {
  const body = (await req.json().catch(() => ({}))) as { id?: string; all?: boolean };

  if (body.all === true) {
    await notificationService.markAllRead(user.id);
    return ok({ marked: "all" });
  }
  if (!body.id) throw new ValidationError("Provide a notification id or all=true");

  await notificationService.markRead(user.id, body.id);
  return ok({ marked: body.id });
});
