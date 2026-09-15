import { Op, type WhereOptions } from "sequelize";
import { Keyword, KeywordRanking } from "@/models";
import type { PaginatedResult, PaginationParams } from "./base";
import { buildPaginatedResult, normalizePagination } from "./base";

export interface KeywordListFilters extends PaginationParams {
  search?: string;
  intent?: string;
  competition?: string;
  sort?: "keyword" | "search_volume" | "difficulty" | "cpc" | "created_at";
  order?: "ASC" | "DESC";
}

export class KeywordRepository {
  async findById(id: string): Promise<Keyword | null> {
    return Keyword.findByPk(id);
  }

  async findByProjectAndId(projectId: string, id: string): Promise<Keyword | null> {
    return Keyword.findOne({ where: { id, project_id: projectId } });
  }

  async findByProjectAndKeyword(
    projectId: string,
    keyword: string,
    country?: string
  ): Promise<Keyword | null> {
    const where: WhereOptions<Keyword> = {
      project_id: projectId,
      keyword,
      ...(country ? { country: country.toLowerCase() } : {}),
    };
    return Keyword.findOne({ where });
  }

    async countByProject(projectId: string): Promise<number> {
    return Keyword.count({ where: { project_id: projectId } });
  }

  /** All keywords for a project (for competitor overlap analysis) */
  async findByProject(projectId: string): Promise<Keyword[]> {
    return Keyword.findAll({ where: { project_id: projectId }, order: [["created_at", "DESC"]] });
  }


  async listByProject(projectId: string, filters?: KeywordListFilters): Promise<PaginatedResult<Keyword>> {
    const { page, pageSize, offset, limit } = normalizePagination(filters);
    const sort = filters?.sort ?? "created_at";
    const order = filters?.order ?? "DESC";
    const where: WhereOptions<Keyword> = {
      project_id: projectId,
      ...(filters?.intent ? { intent: filters.intent } : {}),
      ...(filters?.competition ? { competition: filters.competition } : {}),
      ...(filters?.search ? { keyword: { [Op.like]: `%${filters.search}%` } } : {}),
    };
    const { rows, count } = await Keyword.findAndCountAll({
      where,
      order: [[sort, order]],
      limit,
      offset,
    });
    return buildPaginatedResult(rows, count, page, pageSize);
  }

  /** Latest ranking row per keyword (single query, no N+1) */
  async latestRankingsByKeyword(projectId: string, keywordIds: string[]): Promise<Map<string, KeywordRanking>> {
    const map = new Map<string, KeywordRanking>();
    if (keywordIds.length === 0) return map;
    const rows = await KeywordRanking.findAll({
      where: { project_id: projectId, keyword_id: { [Op.in]: keywordIds } },
      order: [["checked_at", "DESC"]],
    });
    for (const row of rows) {
      if (!map.has(row.keyword_id)) map.set(row.keyword_id, row);
    }
    return map;
  }

  /** Full position history for trend charts (oldest first per keyword) */
  async historyByKeyword(projectId: string, keywordId: string, limit = 90): Promise<KeywordRanking[]> {
    const rows = await KeywordRanking.findAll({
      where: { project_id: projectId, keyword_id: keywordId },
      order: [["checked_at", "DESC"]],
      limit,
    });
    return rows.reverse();
  }

  /** Average-position trend across all keywords, bucketed by day (last N days) */
  async projectDailyTrend(projectId: string, days = 30): Promise<Array<{ date: string; avgPosition: number | null; keywords: number }>> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await KeywordRanking.findAll({
      where: { project_id: projectId, checked_at: { [Op.gte]: since } },
      attributes: ["position", "checked_at"],
      order: [["checked_at", "ASC"]],
      limit: 10000,
    });
    const byDay = new Map<string, { sum: number; count: number }>();
    for (const row of rows) {
      if (row.position === null) continue;
      const day = row.checked_at.toISOString().slice(0, 10);
      const bucket = byDay.get(day) ?? { sum: 0, count: 0 };
      bucket.sum += row.position;
      bucket.count += 1;
      byDay.set(day, bucket);
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, b]) => ({
        date,
        avgPosition: Math.round((b.sum / b.count) * 10) / 10,
        keywords: b.count,
      }));
  }
}

export const keywordRepository = new KeywordRepository();
