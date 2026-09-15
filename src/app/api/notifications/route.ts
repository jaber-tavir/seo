import { ok, withApi } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import { notificationService } from "@/services/NotificationService";

export const dynamic = "force-dynamic";

export const GET = withApi(async ({ req, user }) => {
  const page = Number(req.nextUrl.searchParams.get("page") ?? 1) || 1;
  const unreadOnly = req.nextUrl.searchParams.get("unread") === "true";
  if (page < 1) throw new ValidationError("Invalid page");

  const [result, unreadCount] = await Promise.all([
    notificationService.list(user.id, page, 20, unreadOnly),
    notificationService.unreadCount(user.id),
  ]);

  return ok({
    notifications: result.rows.map((n) => n.toJSON()),
    unread_count: unreadCount,
    pagination: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages },
  });
});
