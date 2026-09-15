import { Op, type WhereOptions } from "sequelize";
import { Content, ContentBrief } from "@/models";
import type { PaginatedResult, PaginationParams } from "./base";
import { buildPaginatedResult, normalizePagination } from "./base";
import type { ContentStatus, KeywordIntent } from "@/constants";

export interface ContentListFilters extends PaginationParams {
  search?: string;
  status?: string;
}

export interface BriefFilters extends PaginationParams {
  keyword?: string;
}

export class ContentRepository {
  // ------------------------------------------------------------ Briefs

  async createBrief(data: {
    project_id: string;
    keyword: string;
    search_intent: KeywordIntent | null;
    suggested_title: string | null;
    outline: object | null;
    competitor_urls: string[] | null;
    related_keywords: string[] | null;
    questions: string[] | null;
  }): Promise<ContentBrief> {
    return ContentBrief.create({
      project_id: data.project_id,
      keyword: data.keyword,
      search_intent: data.search_intent,
      suggested_title: data.suggested_title,
      outline: data.outline ?? null,
      competitor_urls: data.competitor_urls,
      related_keywords: data.related_keywords,
      questions: data.questions,
    });
  }

  async findBriefById(id: string): Promise<ContentBrief | null> {
    return ContentBrief.findByPk(id);
  }

  async findBriefByProjectAndId(projectId: string, id: string): Promise<ContentBrief | null> {
    return ContentBrief.findOne({ where: { id, project_id: projectId } });
  }

  async listBriefs(projectId: string, filters?: BriefFilters): Promise<PaginatedResult<ContentBrief>> {
    const { page, pageSize, offset, limit } = normalizePagination(filters);
    const where: WhereOptions<ContentBrief> = { project_id: projectId };
    if (filters?.keyword) {
      where.keyword = { [Op.like]: `%${filters.keyword}%` };
    }
    const { rows, count } = await ContentBrief.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });
    return buildPaginatedResult(rows, count, page, pageSize);
  }

  async deleteBrief(id: string, projectId: string): Promise<number> {
    return ContentBrief.destroy({ where: { id, project_id: projectId } });
  }

  async findBriefsByOrganizationPaginated(
    organizationId: string,
    filters?: BriefFilters,
  ): Promise<PaginatedResult<ContentBrief>> {
    const { page, pageSize, offset, limit } = normalizePagination(filters);
    const where: Record<string, unknown> = {};
    if (filters?.keyword) {
      where.keyword = { [Op.like]: `%${filters.keyword}%` };
    }
    const { rows, count } = await ContentBrief.findAndCountAll({
      include: [
        { model: ContentBrief.sequelize!.models!.Project, as: 'project', required: true, where: {} },
        {
          model: ContentBrief.sequelize!.models!.Organization,
          as: 'project.organization',
          required: true,
          where: { id: organizationId },
          paranoid: false,
        },
      ],
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });
    return buildPaginatedResult(rows, count, page, pageSize);
  }

  async findContentsByOrganizationPaginated(
    organizationId: string,
    filters?: ContentListFilters,
  ): Promise<PaginatedResult<Content>> {
    const { page, pageSize, offset, limit } = normalizePagination(filters);
    const where: WhereOptions<Content> = {};
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.search) {
      where.title = { [Op.like]: `%${filters.search}%` };
    }
    const { rows, count } = await Content.findAndCountAll({
      include: [
        { model: Content.sequelize!.models!.Project, as: 'project', required: true, where: {} },
        {
          model: Content.sequelize!.models!.Organization,
          as: 'project.organization',
          required: true,
          where: { id: organizationId },
          paranoid: false,
        },
      ],
      where,
      order: [['updated_at', 'DESC']],
      limit,
      offset,
    });
    return buildPaginatedResult(rows, count, page, pageSize);
  }

  // ------------------------------------------------------------ Content documents

  async listContents(projectId: string, filters?: ContentListFilters): Promise<PaginatedResult<Content>> {
    const { page, pageSize, offset, limit } = normalizePagination(filters);
    const where: WhereOptions<Content> = {
      project_id: projectId,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.search ? { title: { [Op.like]: `%${filters.search}%` } } : {}),
    };
    const { rows, count } = await Content.findAndCountAll({
      where,
      order: [["updated_at", "DESC"]],
      limit,
      offset,
    });
    return buildPaginatedResult(rows, count, page, pageSize);
  }

  async findContentById(id: string): Promise<Content | null> {
    return Content.findByPk(id);
  }

  async findContentByProjectAndId(projectId: string, id: string): Promise<Content | null> {
    return Content.findOne({ where: { id, project_id: projectId } });
  }

  /** Used to guarantee a unique slug inside a project. */
  async findContentBySlug(projectId: string, slug: string): Promise<Content | null> {
    return Content.findOne({ where: { project_id: projectId, slug } });
  }

  async createContent(data: {
    project_id: string;
    title: string;
    slug: string;
    content?: string | null;
    meta_title?: string | null;
    meta_description?: string | null;
    status?: ContentStatus;
  }): Promise<Content> {
    return Content.create({
      project_id: data.project_id,
      title: data.title,
      slug: data.slug,
      content: data.content ?? null,
      meta_title: data.meta_title ?? null,
      meta_description: data.meta_description ?? null,
      status: data.status ?? "draft",
    });
  }

  async updateContent(id: string, projectId: string, data: Record<string, unknown>): Promise<Content | null> {
    const row = await this.findContentByProjectAndId(projectId, id);
    if (!row) return null;
    await row.update(data);
    return row;
  }

  async deleteContent(id: string, projectId: string): Promise<number> {
    return Content.destroy({ where: { id, project_id: projectId } });
  }
}

export const contentRepository = new ContentRepository();