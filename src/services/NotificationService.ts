import { notificationRepository } from "@/repositories/NotificationRepository";
import { logger } from "@/lib/logger";
import type { NotificationType } from "@/constants";

/**
 * In-app notification service.
 * (Email delivery for the same events is handled by EmailService at call sites.)
 */
export class NotificationService {
  async notify(input: { userId: string; type: NotificationType; title: string; message: string }): Promise<void> {
    try {
      await notificationRepository.create({
        user_id: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
      });
    } catch (err) {
      logger.error("notification_create_failed", { userId: input.userId, error: err });
    }
  }

  async list(userId: string, page = 1, pageSize = 20, unreadOnly = false) {
    return notificationRepository.listByUser(userId, { page, pageSize }, unreadOnly);
  }

  async unreadCount(userId: string): Promise<number> {
    return notificationRepository.countUnread(userId);
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    await notificationRepository.markRead(notificationId, userId);
  }

  async markAllRead(userId: string): Promise<void> {
    await notificationRepository.markAllRead(userId);
  }
}

export const notificationService = new NotificationService();
