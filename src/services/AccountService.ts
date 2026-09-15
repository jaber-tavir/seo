import { AUDIT_LOG_ACTIONS } from "@/constants";
import { auditLogService } from "./AuditLogService";
import { authService } from "./AuthService";
import { sessionRepository } from "@/repositories/SessionRepository";
import { userRepository } from "@/repositories/UserRepository";
import { organizationService } from "./OrganizationService";
import type { User } from "@/models";
import type { SessionUser } from "@/types";

/** Serialize a user for API/client responses (never the password hash) */
export function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    email_verified: user.email_verified,
    status: user.status,
    created_at: user.created_at?.toISOString() ?? new Date().toISOString(),
  };
}

export class AccountService {
  async updateProfile(
    user: User,
    input: { first_name?: string; last_name?: string | null; avatar?: string | null }
  ): Promise<User> {
    const updates: Record<string, unknown> = {};
    if (input.first_name !== undefined) updates.first_name = input.first_name;
    if (input.last_name !== undefined) updates.last_name = input.last_name;
    if (input.avatar !== undefined) updates.avatar = input.avatar;

    const updated = await userRepository.updateById(user.id, updates);
    if (!updated) throw new Error("User not found");

    await auditLogService.log({
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.PROFILE_UPDATED,
      entity_type: "user",
      entity_id: user.id,
      metadata: { fields: Object.keys(updates) },
    });
    return updated;
  }

  async updateOrganizationName(user: User, name: string) {
    const org = await organizationService.getPrimaryOrganization(user);
    return organizationService.rename(org.id, user.id, name);
  }

  async listSessions(user: User, currentSessionId: string | null) {
    const sessions = await sessionRepository.listByUser(user.id);
    return sessions.map((s) => ({
      id: s.id,
      ip_address: s.ip_address,
      user_agent: s.user_agent,
      last_used_at: s.last_used_at,
      created_at: s.created_at,
      expires_at: s.expires_at,
      current: s.id === currentSessionId,
    }));
  }

  async revokeSession(user: User, sessionId: string) {
    await sessionRepository.deleteById(sessionId, user.id);
    await auditLogService.log({
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.SESSION_REVOKED,
      entity_type: "session",
      entity_id: sessionId,
    });
  }

  async revokeOtherSessions(user: User, currentSessionId: string | null) {
    await sessionRepository.deleteAllForUser(user.id, currentSessionId ?? undefined);
    await auditLogService.log({
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.SESSION_REVOKED,
      entity_type: "session",
      entity_id: "all_others",
    });
  }
}

export const accountService = new AccountService();
// re-export for convenience in API routes
export { authService };
