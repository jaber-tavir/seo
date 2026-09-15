import { Op, type CreateOptions, type CreationAttributes } from "sequelize";
import { Notification } from "@/models";
import type { PaginationParams, PaginatedResult } from "./base";
import { buildPaginatedResult, normalizePagination } from "./base";

export class NotificationRepository {
  async create(attributes: CreationAttributes<Notification>, options?: CreateOptions): Promise<Notification> {
    return Notification.create(attributes, options);
  }

  async listByUser(userId: string, params?: PaginationParams, unreadOnly = false): Promise<PaginatedResult<Notification>> {
    const { page, pageSize, offset, limit } = normalizePagination(params);
    const where = unreadOnly ? { user_id: userId, read_at: null } : { user_id: userId };
    const { rows, count } = await Notification.findAndCountAll({ where, order: [["created_at", "DESC"]], limit, offset });
    return buildPaginatedResult(rows, count, page, pageSize);
  }

  async countUnread(userId: string): Promise<number> {
    return Notification.count({ where: { user_id: userId, read_at: null } });
  }

  async markRead(id: string, userId: string): Promise<void> {
    await Notification.update({ read_at: new Date() }, { where: { id, user_id: userId, read_at: null } });
  }

  async markAllRead(userId: string): Promise<void> {
    await Notification.update({ read_at: new Date() }, { where: { user_id: userId, read_at: { [Op.ne]: null } } });
  }
}

export const notificationRepository = new NotificationRepository();
