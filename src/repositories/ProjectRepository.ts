import { Op, type CreationAttributes, type WhereOptions } from "sequelize";
import { Project } from "@/models";
import type { ProjectStatus } from "@/constants";
import type { PaginatedResult, PaginationParams } from "./base";
import { buildPaginatedResult, normalizePagination } from "./base";

export interface ProjectListFilters extends PaginationParams {
  search?: string;
  status?: ProjectStatus;
}

export class ProjectRepository {
  async create(attributes: CreationAttributes<Project>): Promise<Project> {
    return Project.create(attributes);
  }

  async findById(id: string): Promise<Project | null> {
    return Project.findByPk(id);
  }

  async findByPkWithOrganization(id: string): Promise<Project | null> {
    return Project.findByPk(id);
  }

  async update(id: string, attributes: Partial<CreationAttributes<Project>>): Promise<void> {
    await Project.update(attributes, { where: { id } });
  }

  async updateById(id: string, attributes: Partial<CreationAttributes<Project>>): Promise<Project | null> {
    const project = await Project.findByPk(id);
    if (!project) return null;
    await project.update(attributes);
    return project;
  }

  async delete(id: string): Promise<void> {
    await Project.destroy({ where: { id } });
  }

  async existsByOrgAndDomain(organizationId: string, domain: string, excludeId?: string): Promise<boolean> {
    const where: WhereOptions<Project> = excludeId
      ? { organization_id: organizationId, domain, id: { [Op.ne]: excludeId } }
      : { organization_id: organizationId, domain };
    const count = await Project.count({ where });
    return count > 0;
  }

  async countByOrganization(organizationId: string): Promise<number> {
    return Project.count({ where: { organization_id: organizationId } });
  }

  async countAll(): Promise<number> {
    return Project.count();
  }

  async listByOrganization(organizationId: string, filters?: ProjectListFilters): Promise<PaginatedResult<Project>> {
    const { page, pageSize, offset, limit } = normalizePagination(filters);
    const where: WhereOptions<Project> = {
      organization_id: organizationId,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.search
        ? {
            [Op.or]: [{ name: { [Op.like]: `%${filters.search}%` } }, { domain: { [Op.like]: `%${filters.search}%` } }],
          }
        : {}),
    };

    const { rows, count } = await Project.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });
    return buildPaginatedResult(rows, count, page, pageSize);
  }

  /** Global search over project name/domain, scoped to the organization */
  async search(organizationId: string, query: string, limit = 5): Promise<Project[]> {
    return Project.findAll({
      where: {
        organization_id: organizationId,
        [Op.or]: [{ name: { [Op.like]: `%${query}%` } }, { domain: { [Op.like]: `%${query}%` } }],
      },
      limit,
      order: [["name", "ASC"]],
    });
  }

  /** Aggregated counts used by the project dashboard */
  async getProjectStats(projectId: string): Promise<{
    keywords: number;
    audits: number;
    backlinks: number;
    referringDomains: number;
    competitors: number;
    reports: number;
  }> {
    // Import lazily to avoid circular imports in repository layer
    const models = await import("@/models");
    const [keywords, audits, backlinks, referringDomains, competitors, reports] = await Promise.all([
      models.Keyword.count({ where: { project_id: projectId } }),
      models.SiteAudit.count({ where: { project_id: projectId } }),
      models.Backlink.count({ where: { project_id: projectId } }),
      models.ReferringDomain.count({ where: { project_id: projectId } }),
      models.Competitor.count({ where: { project_id: projectId } }),
      models.Report.count({ where: { project_id: projectId } }),
    ]);
    return { keywords, audits, backlinks, referringDomains, competitors, reports };
  }
}

export const projectRepository = new ProjectRepository();
