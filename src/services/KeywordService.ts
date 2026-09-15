import { Op } from "sequelize";
import { sequelize } from "@/config/database";
import { cacheDeletePattern, cached } from "@/config/redis";
import { AUDIT_LOG_ACTIONS, type Competition, type Device, type KeywordIntent, type SearchEngine } from "@/constants";
import { ExternalApiError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { bucketCounts, positionChange, type PositionBuckets } from "@/lib/ranking-math";
import { attachClusters, clusterKeywords } from "@/lib/keyword-clustering";
import { Keyword, KeywordRanking, type Project, type User } from "@/models";
import { getKeywordProvider } from "@/providers/keyword";
import { getRankProvider } from "@/providers/serp";
import { keywordRepository } from "@/repositories/KeywordRepository";
import { projectRepository } from "@/repositories/ProjectRepository";
import { organizationRepository } from "@/repositories/OrganizationRepository";
import { auditLogService } from "./AuditLogService";
import { notificationService } from "./NotificationService";
import { usageService } from "./UsageService";
import type { RequestMeta } from "./AuthService";
import type { ClusterInput, RankCheckInput, ResearchInput, TrackKeywordInput, TrackKeywordsBulkInput } from "@/validators/keyword";

const RESEARCH_CACHE_TTL_SECONDS = 24 * 60 * 60;

function cacheKey(parts: Array<string | number>): string {
  return ["kw", ...parts.map((p) => String(p).toLowerCase().replace(/[^a-z0-9_-]+/g, "-"))].join(":");
}

export interface EnrichedKeyword {
  id: string;
  keyword: string;
  search_volume: number | null;
  difficulty: number | null;
  cpc: number | null;
  competition: Competition | null;
  intent: KeywordIntent | null;
  country: string;
  language: string;
  position: number | null;
  previous_position: number | null;
  position_change: number | null;
  best_position: number | null;
  ranking_url: string | null;
  checked_at: Date | null;
  cluster: string | null;
}

/**
 * Keyword + rank-tracker service. All access is scoped to the authenticated
 * user's organization (cross-tenant access -> 404 masking, never 403 leaks).
 */
export class KeywordService {
  async getAuthorizedProject(projectId: string, user: User): Promise<Project> {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new NotFoundError("Project not found");
    const allowed = await organizationRepository.canAccess(project.organization_id, user.id);
    if (!allowed) throw new NotFoundError("Project not found");
    return project;
  }

  /** Live keyword research (provider metrics, cached 24h). Consumes keyword_searches usage. */
  async research(user: User, input: ResearchInput, meta: RequestMeta = {}) {
    const country = input.country.toLowerCase();
    const language = input.language.toLowerCase();
    const primaryOrg = await this.primaryOrgId(user);

    await usageService.enforceLimit(primaryOrg, "keyword_searches", 1, "keyword_searches");

    const provider = getKeywordProvider();
    const providerName = provider.name;
    const key = cacheKey(["research", providerName, country, language, input.limit, input.keyword]);

    let result;
    try {
      result = await cached(key, RESEARCH_CACHE_TTL_SECONDS, async () => {
        const [seed, related, suggestions] = await Promise.all([
          provider.getKeywordData(input.keyword, { country, language }),
          provider.getRelatedKeywords(input.keyword, { country, language, limit: input.limit }),
          provider.getKeywordSuggestions(input.keyword, { country, language, limit: 10 }),
        ]);
        return { seed, related, suggestions, provider: providerName };
      });
    } catch (err) {
      logger.warn("keyword_research_provider_failed", { keyword: input.keyword, provider: providerName, error: err instanceof Error ? err.message : String(err) });
      throw new ExternalApiError("Keyword data provider is temporarily unavailable. Please try again later.");
    }

    await usageService.consumeUsage(primaryOrg, "keyword_searches", 1);

    await auditLogService.log({
      organization_id: primaryOrg,
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.KEYWORD_RESEARCHED,
      entity_type: "keyword_research",
      entity_id: null,
      metadata: { keyword: input.keyword, provider: providerName },
      ip_address: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    });

    return { ...result, demo: providerName === "mock" };
  }

  /** Cluster an arbitrary keyword list (pure local algorithm, no provider call). */
  async cluster(user: User, input: ClusterInput, meta: RequestMeta = {}) {
    const clusters = clusterKeywords(input.keywords);
    await auditLogService.log({
      organization_id: await this.primaryOrgId(user),
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.KEYWORDS_CLUSTERED,
      entity_type: "keyword_cluster",
      entity_id: null,
      metadata: { input: input.keywords.length, clusters: clusters.length },
      ip_address: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    });
    return { clusters, total: input.keywords.length };
  }
  /** Track a single keyword on a project (enriches from provider when available). */
  async trackKeyword(user: User, projectId: string, input: TrackKeywordInput, meta: RequestMeta = {}) {
    const project = await this.getAuthorizedProject(projectId, user);
    const keywordText = input.keyword.trim();
    const country = input.country.toLowerCase();
    const language = input.language.toLowerCase();

    const existing = await keywordRepository.findByProjectAndKeyword(project.id, keywordText, country);
    if (existing) return this.enrich(existing);

    await usageService.enforceLimit(project.organization_id, "tracked_keywords", 1, "tracked_keywords");

    const metrics = await this.fetchMetrics(keywordText, country, language);

    const created = await Keyword.create({
      project_id: project.id,
      keyword: keywordText,
      search_volume: metrics.search_volume,
      difficulty: metrics.difficulty,
      cpc: metrics.cpc,
      competition: metrics.competition,
      intent: metrics.intent,
      country,
      language,
    });

    await auditLogService.log({
      organization_id: project.organization_id,
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.KEYWORD_ADDED,
      entity_type: "keyword",
      entity_id: created.id,
      metadata: { keyword: keywordText, project_id: project.id },
      ip_address: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    });

    return this.enrich(created);
  }

  /** Bulk-track keywords (transactional, deduped, plan-limit enforced). */
  async trackKeywordsBulk(user: User, projectId: string, input: TrackKeywordsBulkInput, meta: RequestMeta = {}) {
    const project = await this.getAuthorizedProject(projectId, user);
    const country = input.country.toLowerCase();
    const language = input.language.toLowerCase();

    const unique = [...new Set(input.keywords.map((k) => k.trim()).filter(Boolean))];
    if (unique.length === 0) throw new ForbiddenError("No keywords provided");

    const already = await Keyword.findAll({ where: { project_id: project.id, keyword: { [Op.in]: unique } }, attributes: ["keyword", "country"] });
    const have = new Set(already.filter((k) => k.country === country).map((k) => k.keyword.toLowerCase()));
    const fresh = unique.filter((k) => !have.has(k.toLowerCase()));

    if (fresh.length > 0) {
      await usageService.enforceLimit(project.organization_id, "tracked_keywords", fresh.length, "tracked_keywords");
    }

    const created: Keyword[] = [];
    const transaction = await sequelize.transaction();
    try {
      for (const keywordText of fresh) {
        const metrics = await this.fetchMetrics(keywordText, country, language);
        created.push(
          await Keyword.create(
            {
              project_id: project.id,
              keyword: keywordText,
              search_volume: metrics.search_volume,
              difficulty: metrics.difficulty,
              cpc: metrics.cpc,
              competition: metrics.competition,
              intent: metrics.intent,
              country,
              language,
            },
            { transaction }
          )
        );
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    if (created.length > 0) {
      await auditLogService.log({
        organization_id: project.organization_id,
        user_id: user.id,
        action: AUDIT_LOG_ACTIONS.KEYWORD_ADDED,
        entity_type: "keyword",
        entity_id: null,
        metadata: { project_id: project.id, added: created.length, skipped_duplicates: unique.length - fresh.length },
        ip_address: meta.ip ?? null,
        user_agent: meta.userAgent ?? null,
      });
    }

    return {
      added: created.length,
      skipped_duplicates: unique.length - fresh.length,
      keywords: await Promise.all(created.map((k) => this.enrich(k))),
    };
  }

  private async fetchMetrics(keywordText: string, country: string, language: string) {
    const provider = getKeywordProvider();
    try {
      const data = await cached(
        cacheKey(["metrics", provider.name, country, language, keywordText]),
        RESEARCH_CACHE_TTL_SECONDS,
        () => provider.getKeywordData(keywordText, { country, language })
      );
      return {
        search_volume: data.search_volume,
        difficulty: data.difficulty,
        cpc: data.cpc,
        competition: data.competition as Competition | null,
        intent: data.intent as KeywordIntent | null,
      };
    } catch (err) {
      logger.warn("keyword_metrics_enrich_failed", { keyword: keywordText, error: err instanceof Error ? err.message : String(err) });
      return { search_volume: null, difficulty: null, cpc: null, competition: null, intent: null };
    }
  }
  async listKeywords(user: User, projectId: string, query: { page?: number; pageSize?: number; search?: string; intent?: string; competition?: string; sort?: "keyword" | "search_volume" | "difficulty" | "cpc" | "created_at"; order?: "ASC" | "DESC" }) {
    const project = await this.getAuthorizedProject(projectId, user);
    const page = await keywordRepository.listByProject(project.id, query);
    const latest = await keywordRepository.latestRankingsByKeyword(
      project.id,
      page.rows.map((k) => k.id)
    );
    const enriched = await Promise.all(
      page.rows.map((k) => this.enrich(k, latest.get(k.id) ?? null))
    );
    const clusters = clusterKeywords(enriched.map((e) => e.keyword));
    const rows = attachClusters(enriched, clusters);
    return { ...page, rows };
  }

  async removeKeyword(user: User, projectId: string, keywordId: string, meta: RequestMeta = {}) {
    const project = await this.getAuthorizedProject(projectId, user);
    const keyword = await keywordRepository.findByProjectAndId(project.id, keywordId);
    if (!keyword) throw new NotFoundError("Keyword not found");

    const transaction = await sequelize.transaction();
    try {
      await KeywordRanking.destroy({ where: { keyword_id: keyword.id }, transaction });
      await keyword.destroy({ transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    await auditLogService.log({
      organization_id: project.organization_id,
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.KEYWORD_REMOVED,
      entity_type: "keyword",
      entity_id: keyword.id,
      metadata: { keyword: keyword.keyword, project_id: project.id },
      ip_address: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    });

    return { id: keyword.id };
  }
  /** Run a rank check for one tracked keyword (writes a KeywordRanking row). */
  async checkRank(user: User, projectId: string, keywordId: string, input: RankCheckInput, meta: RequestMeta = {}) {
    const project = await this.getAuthorizedProject(projectId, user);
    const keyword = await keywordRepository.findByProjectAndId(project.id, keywordId);
    if (!keyword) throw new NotFoundError("Keyword not found");

    const provider = getRankProvider();
    const result = await provider.checkPosition(project.domain, keyword.keyword, {
      country: input.country,
      city: input.city,
      language: input.language,
      searchEngine: input.search_engine as "google" | "bing" | "yahoo",
      device: input.device as "desktop" | "mobile" | "tablet",
    });

    const previous = await KeywordRanking.findOne({
      where: { keyword_id: keyword.id },
      order: [["checked_at", "DESC"]],
    });

    const best = previous?.best_position != null && result.position != null
      ? Math.min(previous.best_position, result.position)
      : (result.position ?? previous?.best_position ?? null);

    const ranking = await KeywordRanking.create({
      keyword_id: keyword.id,
      project_id: project.id,
      position: result.position,
      previous_position: previous?.position ?? null,
      best_position: best,
      ranking_url: result.rankingUrl,
      search_engine: input.search_engine as SearchEngine,
      device: input.device as Device,
      country: input.country.toLowerCase(),
      city: input.city ?? null,
      language: input.language.toLowerCase(),
      checked_at: result.checkedAt,
    });

    await auditLogService.log({
      organization_id: project.organization_id,
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.RANKING_CHECKED,
      entity_type: "keyword_ranking",
      entity_id: ranking.id,
      metadata: { keyword: keyword.keyword, position: result.position, provider: provider.name },
      ip_address: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    });

    await this.notifyOnMovement(project, user, keyword.keyword, result.position, previous?.position ?? null);

    return {
      keyword_id: keyword.id,
      keyword: keyword.keyword,
      position: result.position,
      previous_position: previous?.position ?? null,
      position_change: positionChange(result.position, previous?.position ?? null),
      best_position: best,
      ranking_url: result.rankingUrl,
      checked_at: ranking.checked_at,
      demo: provider.name === "mock",
    };
  }

  async keywordHistory(user: User, projectId: string, keywordId: string) {
    const project = await this.getAuthorizedProject(projectId, user);
    const keyword = await keywordRepository.findByProjectAndId(project.id, keywordId);
    if (!keyword) throw new NotFoundError("Keyword not found");
    const history = await keywordRepository.historyByKeyword(project.id, keyword.id);
    return {
      keyword: keyword.toJSON(),
      history: history.map((h) => h.toJSON()),
    };
  }
  /** Rank-tracker overview: buckets, visibility, trend, per-keyword latest. */
  async rankOverview(user: User, projectId: string) {
    const project = await this.getAuthorizedProject(projectId, user);
    const keywords = await Keyword.findAll({ where: { project_id: project.id }, attributes: ["id", "keyword"] });
    const latest = await keywordRepository.latestRankingsByKeyword(
      project.id,
      keywords.map((k) => k.id)
    );
    const positions = keywords.map((k) => latest.get(k.id)?.position ?? null);
    const buckets: PositionBuckets = bucketCounts(positions);
    const trend = await keywordRepository.projectDailyTrend(project.id, 30);

    const rows = keywords.map((k) => {
      const r = latest.get(k.id);
      return {
        id: k.id,
        keyword: k.keyword,
        position: r?.position ?? null,
        previous_position: r?.previous_position ?? null,
        position_change: positionChange(r?.position ?? null, r?.previous_position ?? null),
        best_position: r?.best_position ?? null,
        ranking_url: r?.ranking_url ?? null,
        checked_at: r?.checked_at ?? null,
      };
    }).sort((a, b) => (a.position ?? 9999) - (b.position ?? 9999));

    return { buckets, trend, keywords: rows, total: rows.length };
  }

  // ------------------------------------------------------------ internals

  private async primaryOrgId(user: User): Promise<string> {
    const { organizationService } = await import("./OrganizationService");
    const org = await organizationService.getPrimaryOrganization(user);
    return org.id;
  }

  private async enrich(keyword: Keyword, latest?: KeywordRanking | null): Promise<EnrichedKeyword> {
    const ranking = latest ?? (await KeywordRanking.findOne({
      where: { keyword_id: keyword.id },
      order: [["checked_at", "DESC"]],
    }));
    return {
      id: keyword.id,
      keyword: keyword.keyword,
      search_volume: keyword.search_volume,
      difficulty: keyword.difficulty,
      cpc: keyword.cpc ? Number(keyword.cpc) : null,
      competition: keyword.competition,
      intent: keyword.intent,
      country: keyword.country,
      language: keyword.language,
      position: ranking?.position ?? null,
      previous_position: ranking?.previous_position ?? null,
      position_change: positionChange(ranking?.position ?? null, ranking?.previous_position ?? null),
      best_position: ranking?.best_position ?? null,
      ranking_url: ranking?.ranking_url ?? null,
      checked_at: ranking?.checked_at ?? null,
      cluster: null,
    };
  }

  private async notifyOnMovement(
    project: Project,
    user: User,
    keywordText: string,
    current: number | null,
    previous: number | null
  ): Promise<void> {
    const change = positionChange(current, previous);
    if (change === null || change === 0) return;
    const significant =
      (previous !== null && previous > 10 && current !== null && current <= 10) ||
      (previous !== null && previous <= 10 && (current === null || current > 10)) ||
      Math.abs(change) >= 5;
    if (!significant) return;
    const direction = change > 0 ? "improved" : "dropped";
    await notificationService.notify({
      userId: user.id,
      type: "ranking_changed",
      title: `"${keywordText}" ${direction} to position ${current ?? "100+"}`,
      message: `${project.domain}: ${keywordText} moved from ${previous ?? "unranked"} to ${current ?? "unranked"} (${change > 0 ? "+" : ""}${change}).`,
    });
  }
}

export const keywordService = new KeywordService();

/** Invalidate cached research metrics (used by tests/admin). */
export async function invalidateKeywordCache(): Promise<void> {
  await cacheDeletePattern("kw:");
}
