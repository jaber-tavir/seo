import type { CreateOptions, CreationAttributes, FindOptions } from "sequelize";
import { Organization, OrganizationMember, User } from "@/models";
import type { MemberRole } from "@/constants";

export class OrganizationRepository {
  async findById(id: string, options?: FindOptions): Promise<Organization | null> {
    return Organization.findByPk(id, options);
  }

  async findByOwner(userId: string): Promise<Organization | null> {
    return Organization.findOne({ where: { owner_id: userId } });
  }

  async create(attributes: CreationAttributes<Organization>, options?: CreateOptions): Promise<Organization> {
    return Organization.create(attributes, options);
  }

  async addMember(
    organizationId: string,
    userId: string,
    role: MemberRole,
    options?: CreateOptions
  ): Promise<OrganizationMember> {
    return OrganizationMember.create({ organization_id: organizationId, user_id: userId, role }, options);
  }

  async update(id: string, attributes: Partial<CreationAttributes<Organization>>): Promise<void> {
    await Organization.update(attributes, { where: { id } });
  }

  async countAll(): Promise<number> {
    return Organization.count();
  }

  async findMembership(organizationId: string, userId: string): Promise<OrganizationMember | null> {
    return OrganizationMember.findOne({ where: { organization_id: organizationId, user_id: userId } });
  }

  async listMembershipsForUser(userId: string): Promise<Organization[]> {
    const memberships = await OrganizationMember.findAll({
      where: { user_id: userId },
      include: [{ model: Organization, as: "organization" }],
    });
    return memberships.map((m) => m.get("organization") as Organization);
  }

  /**
   * Authorization core: does the user own the organization or hold a
   * membership in it? Used to scope every project/data query.
   */
  async canAccess(organizationId: string, userId: string): Promise<boolean> {
    const org = await Organization.findByPk(organizationId, { attributes: ["id", "owner_id"] });
    if (!org) return false;
    if (org.owner_id === userId) return true;
    const membership = await this.findMembership(organizationId, userId);
    return Boolean(membership);
  }

  /** All users that should be notified about org events (owner + members) */
  async listMembers(organizationId: string): Promise<OrganizationMember[]> {
    const org = await Organization.findByPk(organizationId, { attributes: ["id", "owner_id"] });
    const members = await OrganizationMember.findAll({ where: { organization_id: organizationId } });
    if (org && !members.some((m) => m.user_id === org.owner_id)) {
      const phantom = OrganizationMember.build({ organization_id: organizationId, user_id: org.owner_id, role: "owner" });
      return [phantom, ...members];
    }
    return members;
  }

  async listAdmin(limit = 50, offset = 0): Promise<{ rows: Organization[]; total: number }> {
    const { rows, count } = await Organization.findAndCountAll({
      order: [["created_at", "DESC"]],
      limit,
      offset,
      include: [
        { model: User, as: "owner", attributes: ["id", "email", "first_name", "last_name"] },
        { model: (await import("@/models")).Plan, as: "plan", attributes: ["id", "name", "slug"] },
      ],
      distinct: true,
    });
    return { rows, total: count };
  }
}

export const organizationRepository = new OrganizationRepository();
