import type { Transaction } from "sequelize";
import { Organization } from "@/models";
import { sequelize } from "@/config/database";
import { organizationRepository } from "@/repositories/OrganizationRepository";
import { planRepository } from "@/repositories/PlanRepository";
import { DatabaseError, ForbiddenError, NotFoundError } from "@/lib/errors";
import type { MemberRole } from "@/constants";

interface OrgUserRef {
  id: string;
  email: string;
  first_name: string | null;
}

/**
 * Organization (tenant) service.
 * Every user gets a personal organization at registration - the foundation
 * for future team functionality.
 */
export class OrganizationService {
  /** Create an organization (on the free plan) with the user as owner/member */
  async createForUser(
    user: OrgUserRef,
    options?: { transaction?: Transaction; displayName?: string; role?: MemberRole }
  ): Promise<Organization> {
    const freePlan = await planRepository.findBySlug("free");
    if (!freePlan) {
      throw new DatabaseError("Default plan is missing. Run `npm run db:seed` to seed plans.");
    }
    const displayName = options?.displayName ?? `${user.first_name ?? user.email.split("@")[0]}'s Organization`;

    const createIn = async (transaction?: Transaction): Promise<Organization> => {
      const org = await organizationRepository.create(
        { name: displayName, owner_id: user.id, plan_id: freePlan.id },
        transaction ? { transaction } : undefined
      );
      await organizationRepository.addMember(org.id, user.id, options?.role ?? "owner", transaction ? { transaction } : undefined);
      return org;
    };

    if (options?.transaction) return createIn(options.transaction);
    return sequelize.transaction(async (t) => createIn(t));
  }

  /**
   * The organization used for the user's data. Owned organization first,
   * otherwise first membership. Self-heals (creates a personal org) if the
   * user somehow has none.
   */
  async getPrimaryOrganization(user: OrgUserRef): Promise<Organization> {
    const owned = await organizationRepository.findByOwner(user.id);
    if (owned) return owned;

    const memberships = await organizationRepository.listMembershipsForUser(user.id);
    if (memberships.length > 0) return memberships[0];

    return this.createForUser(user);
  }

  /** Authorization core: ownership or membership */
  async canAccess(organizationId: string, userId: string): Promise<boolean> {
    return organizationRepository.canAccess(organizationId, userId);
  }

  async rename(organizationId: string, userId: string, name: string): Promise<Organization> {
    const org = await organizationRepository.findById(organizationId);
    if (!org) throw new NotFoundError("Organization not found");
    if (!(await this.canAccess(organizationId, userId))) throw new ForbiddenError();
    await organizationRepository.update(organizationId, { name });
    const updated = await organizationRepository.findById(organizationId);
    if (!updated) throw new NotFoundError("Organization not found");
    return updated;
  }
}

export const organizationService = new OrganizationService();
