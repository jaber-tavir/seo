import type { CreationAttributes, Transaction } from "sequelize";
import { AuditLog } from "@/models";

export interface AuditLogInput {
  organization_id?: string | null;
  user_id?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

export class AuditLogRepository {
  async create(attributes: CreationAttributes<AuditLog>, options?: { transaction?: Transaction }): Promise<AuditLog> {
    return AuditLog.create(attributes, options);
  }

  async listByOrganization(organizationId: string, limit = 50, offset = 0): Promise<{ rows: AuditLog[]; total: number }> {
    const { rows, count } = await AuditLog.findAndCountAll({
      where: { organization_id: organizationId },
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });
    return { rows, total: count };
  }

  async countAll(): Promise<number> {
    return AuditLog.count();
  }
}

export const auditLogRepository = new AuditLogRepository();
