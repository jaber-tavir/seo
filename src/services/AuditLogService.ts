import type { Transaction } from "sequelize";
import { AUDIT_LOG_ACTIONS } from "@/constants";
import { logger } from "@/lib/logger";
import { auditLogRepository, type AuditLogInput } from "@/repositories/AuditLogRepository";

/**
 * Structured activity/security logging into the `audit_logs` table.
 * Logging failures must never break the main flow.
 */
export class AuditLogService {
  async log(input: AuditLogInput, transaction?: Transaction): Promise<void> {
    try {
      await auditLogRepository.create(
        {
          organization_id: input.organization_id ?? null,
          user_id: input.user_id ?? null,
          action: input.action,
          entity_type: input.entity_type ?? null,
          entity_id: input.entity_id ?? null,
          metadata: input.metadata ?? null,
          ip_address: input.ip_address ?? null,
          user_agent: input.user_agent ?? null,
        },
        transaction ? { transaction } : undefined
      );
    } catch (err) {
      logger.error("audit_log_write_failed", { action: input.action, error: err });
    }
  }

  async logAction(action: keyof typeof AUDIT_LOG_ACTIONS, input: Omit<AuditLogInput, "action">): Promise<void> {
    await this.log({ ...input, action: AUDIT_LOG_ACTIONS[action] });
  }

  async listForOrganization(organizationId: string, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const { rows, total } = await auditLogRepository.listByOrganization(organizationId, pageSize, offset);
    return {
      rows,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
}

export const auditLogService = new AuditLogService();
