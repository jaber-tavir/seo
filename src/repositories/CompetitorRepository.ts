import { Competitor } from "@/models/Competitor";
import { buildPaginatedResult, normalizePagination } from "@/repositories/base";
import type { PaginatedResult } from "@/repositories/base";
import { Op, type WhereOptions } from "sequelize";
import type { CompetitorListQuery } from "@/validators/competitor";

export class CompetitorRepository {
  async create(data: { project_id: string; domain: string; name?: string | null }): Promise<Competitor> {
    return Competitor.create(data);
  }

  async findById(id: string): Promise<Competitor | null> {
    return Competitor.findByPk(id);
  }

  async findByProjectPaginated(projectId: string, query: CompetitorListQuery): Promise<PaginatedResult<Competitor>> {
    const { page, pageSize, offset, limit } = normalizePagination(query);
    const sortMap = { domain: "domain", name: "name", created_at: "created_at" };
    const sortField = sortMap[query.sort] ?? "created_at";
    const where: WhereOptions<Competitor> = { project_id: projectId };
    if (query.search) {
      where.domain = { [Op.like]: `%${query.search}%` };
    }
    const { rows, count } = await Competitor.findAndCountAll({
      where,
      order: [[sortField, query.order]],
      limit,
      offset,
    });
    return buildPaginatedResult(rows, count, page, pageSize);
  }

  async findByDomain(projectId: string, domain: string): Promise<Competitor | null> {
    return Competitor.findOne({ where: { project_id: projectId, domain } });
  }

  /** All competitors for a project (content-gap loops over each domain) */
  async findAllByProject(projectId: string): Promise<Competitor[]> {
    return Competitor.findAll({ where: { project_id: projectId }, order: [["created_at", "DESC"]] });
  }

  async delete(id: string, projectId: string): Promise<number> {
    return Competitor.destroy({ where: { id, project_id: projectId } });
  }
}

export const competitorRepository = new CompetitorRepository();

