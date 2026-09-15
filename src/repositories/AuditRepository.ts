import type { WhereOptions } from "sequelize";
import { Crawl, CrawlPage, SeoIssue, SiteAudit } from "@/models";
import type { PaginatedResult, PaginationParams } from "./base";
import { buildPaginatedResult, normalizePagination } from "./base";

export interface IssueListFilters extends PaginationParams {
  severity?: string;
  type?: string;
  status?: string;
}

export class AuditRepository {
  async createAudit(projectId: string) {
    return SiteAudit.create({ project_id: projectId, status: "pending" });
  }

  async findAuditById(auditId: string) {
    return SiteAudit.findByPk(auditId);
  }

  async updateAudit(auditId: string, attrs: Partial<{ status: string; score: number | null; health_score: number | null; pages_total: number; pages_crawled: number; errors: number; warnings: number; notices: number; started_at: Date | null; completed_at: Date | null }>) {
    const audit = await SiteAudit.findByPk(auditId);
    if (!audit) return null;
    await audit.update(attrs as Record<string, unknown>);
    return audit;
  }

  async latestAuditForProject(projectId: string) {
    return SiteAudit.findOne({ where: { project_id: projectId }, order: [["created_at", "DESC"]] });
  }

  async listAuditsForProject(projectId: string, filters?: PaginationParams): Promise<PaginatedResult<SiteAudit>> {
    const { page, pageSize, offset, limit } = normalizePagination(filters);
    const { rows, count } = await SiteAudit.findAndCountAll({
      where: { project_id: projectId },
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });
    return buildPaginatedResult(rows, count, page, pageSize);
  }

  async createCrawl(auditId: string, projectId: string) {
    return Crawl.create({ audit_id: auditId, project_id: projectId, status: "pending" });
  }

  async findCrawlById(crawlId: string) {
    return Crawl.findByPk(crawlId);
  }

  async updateCrawl(crawlId: string, attrs: Record<string, unknown>) {
    const crawl = await Crawl.findByPk(crawlId);
    if (!crawl) return null;
    await crawl.update(attrs);
    return crawl;
  }

  async createPage(attrs: Record<string, unknown>) {
    return CrawlPage.create(attrs as never);
  }

  async listPages(crawlId: string, filters?: PaginationParams): Promise<PaginatedResult<CrawlPage>> {
    const { page, pageSize, offset, limit } = normalizePagination(filters);
    const { rows, count } = await CrawlPage.findAndCountAll({
      where: { crawl_id: crawlId },
      order: [["crawled_at", "ASC"]],
      limit,
      offset,
    });
    return buildPaginatedResult(rows, count, page, pageSize);
  }

  async createIssues(rows: Array<Record<string, unknown>>) {
    if (rows.length === 0) return [];
    return SeoIssue.bulkCreate(rows as never[]);
  }

  async listIssues(auditId: string, filters?: IssueListFilters): Promise<PaginatedResult<SeoIssue>> {
    const { page, pageSize, offset, limit } = normalizePagination(filters);
    const where: WhereOptions<SeoIssue> = {
      audit_id: auditId,
      ...(filters?.severity ? { severity: filters.severity } : {}),
      ...(filters?.type ? { type: filters.type } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    };
    const { rows, count } = await SeoIssue.findAndCountAll({
      where,
      order: [["created_at", "ASC"]],
      limit,
      offset,
    });
    return buildPaginatedResult(rows, count, page, pageSize);
  }

  async countBySeverity(auditId: string): Promise<{ errors: number; warnings: number; notices: number }> {
    const [errors, warnings, notices] = await Promise.all([
      SeoIssue.count({ where: { audit_id: auditId, type: "error" } }),
      SeoIssue.count({ where: { audit_id: auditId, type: "warning" } }),
      SeoIssue.count({ where: { audit_id: auditId, type: "notice" } }),
    ]);
    return { errors, warnings, notices };
  }
}

export const auditRepository = new AuditRepository();
