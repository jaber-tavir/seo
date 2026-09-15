import { getKeywordProvider } from "@/providers/keyword";
import { competitorRepository } from "@/repositories/CompetitorRepository";
import { projectRepository } from "@/repositories/ProjectRepository";
import { organizationRepository } from "@/repositories/OrganizationRepository";
import { keywordRepository } from "@/repositories/KeywordRepository";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { AUDIT_LOG_ACTIONS } from "@/constants";
import { auditLogService } from "./AuditLogService";
import type { User, Competitor } from "@/models";
import type { RequestMeta } from "./AuthService";
import type { AddCompetitorInput, CompetitorListQuery } from "@/validators/competitor";

export interface CompetitorAngle {
  id: string;
  domain: string;
  name: string | null;
  organicKeywordCount: number;
  estimatedTraffic: number;
  overlap: number;
}

export interface CompetitorAnalysis {
  competitor: { id: string; domain: string; name: string | null; created_at: string };
  organicKeywords: Array<{
    keyword: string;
    search_volume: number | null;
    difficulty: number | null;
    intent: string | null;
    position: number | null;
    url: string | null;
  }>;
  estimatedTraffic: { total: number; trackedOverlap: number; relatedCount: number };
  topPages: Array<{ url: string; keywords: number; traffic: number }>;
  keywordOverlap: { common: string[]; missing: string[]; unique: string[] };
  provider: string;
  demo: boolean;
}

export interface CompetitorComparison {
  project: { id: string; domain: string };
  competitors: CompetitorAngle[];
  keywordOverlap: { common: string[]; missing: string[]; unique: string[] };
}

export interface ContentGapItem {
  keyword: string;
  search_volume: number | null;
  difficulty: number | null;
  intent: string | null;
  competitorCount: number;
  competitors: string[];
}

export interface ContentGapResult {
  items: ContentGapItem[];
  total: number;
}

// Shared ownership guard - reuses ProjectService 404-masking authorization
async function getAuthorizedProject(projectId: string, user: User) {
  const { projectService } = await import("./ProjectService");
    return projectService.getAuthorizedProject(projectId, user);
}

export class CompetitorService {
  async getAuthorizedCompetitor(competitorId: string, user: User, projectId: string): Promise<Competitor> {
    const project = await getAuthorizedProject(projectId, user);
    const competitor = await competitorRepository.findById(competitorId);
    if (!competitor || competitor.project_id !== project.id) throw new NotFoundError("Competitor not found");
    return competitor;
  }

  async listCompetitors(user: User, projectId: string, query: CompetitorListQuery) {
    const project = await getAuthorizedProject(projectId, user);
    return competitorRepository.findByProjectPaginated(project.id, query);
  }

  async addCompetitor(user: User, projectId: string, input: AddCompetitorInput, meta: RequestMeta = {}) {
    const project = await getAuthorizedProject(projectId, user);
    const org = await organizationRepository.findById(project.organization_id);
    if (!org) throw new NotFoundError("Organization not found");
    if (!(await organizationRepository.canAccess(org.id, user.id))) throw new NotFoundError("Project not found");

    const normalizedDomain = input.domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*/, "").trim();
    if (!normalizedDomain) throw new ValidationError("Please provide a valid domain (e.g. example.com)");

    if (await competitorRepository.findByDomain(project.id, normalizedDomain)) {
      throw new ConflictError("This competitor is already being tracked for this project");
    }

    const competitor = await competitorRepository.create({
      project_id: project.id,
      domain: normalizedDomain,
      name: input.name ?? normalizedDomain,
    });

    await auditLogService.log({
      organization_id: org.id,
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.COMPETITOR_ADDED,
      entity_type: "competitor",
      entity_id: competitor.id,
      metadata: { domain: competitor.domain, project_id: project.id },
      ip_address: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    });

    return competitor;
  }

  async deleteCompetitor(user: User, projectId: string, competitorId: string, meta: RequestMeta = {}) {
    const competitor = await this.getAuthorizedCompetitor(competitorId, user, projectId);
    await competitorRepository.delete(competitor.id, competitor.project_id);

    const project = await projectRepository.findById(competitor.project_id);
    await auditLogService.log({
      organization_id: project?.organization_id,
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.COMPETITOR_REMOVED,
      entity_type: "competitor",
      entity_id: competitor.id,
      metadata: { domain: competitor.domain, project_id: competitor.project_id },
      ip_address: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    });

        return { id: competitor.id };
  }

  /** Full competitor analysis: keyword overlap, organic keywords, estimated traffic.
   *  Uses the configured keyword provider (mock in dev, real provider when configured). */
  async analyzeCompetitor(user: User, projectId: string, competitorId: string): Promise<CompetitorAnalysis> {
    const competitor = await this.getAuthorizedCompetitor(competitorId, user, projectId);
    const project = await projectRepository.findById(projectId);
    if (!project) throw new NotFoundError("Project not found");

    const tracked = await keywordRepository.findByProject(project.id);
    const ownKeywords = new Set(tracked.map((k) => k.keyword.toLowerCase()));

        const { organic, providerName, demo } = await this.domainKeywords(competitor.domain, {
      country: project.country,
      language: project.language,
      limit: 30,
    });
    const organicKeywords = organic.map((k) => ({
      keyword: k.keyword,
      search_volume: k.search_volume,
      difficulty: k.difficulty,
      intent: k.intent,
      position: k.position ?? null,
      url: k.url ?? null,
    }));

    const relatedLower = organicKeywords.map((k) => k.keyword.toLowerCase());
    const { common, missing, unique } = overlapSets(relatedLower, ownKeywords);
    const estimatedTraffic = organicKeywords.reduce((sum, k) => sum + estimateKeywordTraffic(k.search_volume, k.position), 0);

    logger.info("competitor_analyzed", { competitorId, projectId, relatedCount: organicKeywords.length, overlap: common.length });

    return {
      competitor: {
        id: competitor.id,
        domain: competitor.domain,
        name: competitor.name,
        created_at: competitor.created_at.toISOString(),
      },
      organicKeywords,
      estimatedTraffic: { total: estimatedTraffic, trackedOverlap: common.length, relatedCount: organicKeywords.length },
      topPages: topPagesFromKeywords(organicKeywords),
      keywordOverlap: { common, missing, unique },
      provider: providerName,
      demo,
    };
  }

  /** Side-by-side comparison: Website vs Competitor 1 vs Competitor 2. */
  async compareCompetitors(user: User, projectId: string, ids: string[]): Promise<CompetitorComparison> {
    const project = await getAuthorizedProject(projectId, user);
    const uniqueIds = [...new Set(ids)].slice(0, 5);
    if (uniqueIds.length === 0) throw new ValidationError("Select at least one competitor to compare");

    const tracked = await keywordRepository.findByProject(project.id);
    const ownKeywords = new Set(tracked.map((k) => k.keyword.toLowerCase()));

    const angles: CompetitorAngle[] = [];
    const allMissing = new Set<string>();
    const commonAcrossAll = new Set<string>();
    let first = true;

    for (const id of uniqueIds) {
      const competitor = await this.getAuthorizedCompetitor(id, user, projectId);
      const { organic } = await this.domainKeywords(competitor.domain, {
        country: project.country,
        language: project.language,
        limit: 30,
      });
      const lower = organic.map((k) => k.keyword.toLowerCase());
      const { common, missing } = overlapSets(lower, ownKeywords);
      for (const m of missing) allMissing.add(m);
      if (first) {
        for (const c of common) commonAcrossAll.add(c);
        first = false;
      } else {
        for (const c of [...commonAcrossAll]) {
          if (!common.includes(c)) commonAcrossAll.delete(c);
        }
      }
      const traffic = organic.reduce((sum, k) => sum + estimateKeywordTraffic(k.search_volume, k.position ?? null), 0);
      angles.push({
        id: competitor.id,
        domain: competitor.domain,
        name: competitor.name,
        organicKeywordCount: lower.length,
        estimatedTraffic: traffic,
        overlap: common.length,
      });
    }

    const commonList = [...commonAcrossAll];
    return {
      project: { id: project.id, domain: project.domain },
      competitors: angles,
      keywordOverlap: {
        common: commonList,
        missing: [...allMissing],
        unique: [...ownKeywords].filter((k) => !allMissing.has(k) && !commonList.includes(k)),
      },
    };
  }

  /** Content gap: keywords competitors rank for that the project does not track. */
  async contentGap(
    user: User,
    projectId: string,
    query: { minVolume?: number; maxDifficulty?: number; intent?: string; minCompetitors?: number }
  ): Promise<ContentGapResult> {
    const project = await getAuthorizedProject(projectId, user);
    const competitors = await competitorRepository.findAllByProject(project.id);
    if (competitors.length === 0) throw new ValidationError("Add at least one competitor first");

    const tracked = await keywordRepository.findByProject(project.id);
    const ownKeywords = new Set(tracked.map((k) => k.keyword.toLowerCase()));

    const byKeyword = new Map<string, { item: ContentGapItem; domains: Set<string> }>();
    for (const competitor of competitors) {
      const { organic } = await this.domainKeywords(competitor.domain, {
        country: project.country,
        language: project.language,
        limit: 30,
      });
      for (const k of organic) {
        const lower = k.keyword.toLowerCase();
        if (ownKeywords.has(lower)) continue;
        const existing = byKeyword.get(lower);
        if (existing) {
          existing.domains.add(competitor.domain);
        } else {
          byKeyword.set(lower, {
            item: {
              keyword: k.keyword,
              search_volume: k.search_volume,
              difficulty: k.difficulty,
              intent: k.intent,
              competitorCount: 1,
              competitors: [competitor.domain],
            },
            domains: new Set([competitor.domain]),
          });
        }
      }
    }

    const minVolume = query.minVolume as number | undefined;
    const maxDifficulty = query.maxDifficulty as number | undefined;
    const minCompetitors = query.minCompetitors as number | undefined;
    let items = [...byKeyword.values()].map(({ item, domains }) => ({
      ...item,
      competitorCount: domains.size,
      competitors: [...domains],
    }));

    if (minVolume !== undefined) items = items.filter((i) => (i.search_volume ?? 0) >= minVolume);
    if (maxDifficulty !== undefined) items = items.filter((i) => (i.difficulty ?? 100) <= maxDifficulty);
    if (query.intent) items = items.filter((i) => i.intent === query.intent);
    if (minCompetitors !== undefined) items = items.filter((i) => i.competitorCount >= minCompetitors);

    items.sort((a, b) => b.competitorCount - a.competitorCount || (b.search_volume ?? 0) - (a.search_volume ?? 0));

    return { items: items.slice(0, 100), total: items.length };
  }

  /**
   * Domain keywords via the configured provider.
   * Prefers getDomainKeywords when available; otherwise an empty set
   * (nothing is fabricated - nulls stay null).
   */
  private async domainKeywords(
    domain: string,
    options: { country: string; language: string; limit: number }
  ): Promise<{ organic: CompetitorKeyword[]; providerName: string; demo: boolean }> {
    const provider = getKeywordProvider();
    const demo = provider.name === "mock";
    if (provider.getDomainKeywords) {
      try {
        const result = await provider.getDomainKeywords(domain, options);
        return { organic: result.keywords, providerName: provider.name, demo };
      } catch (err) {
        logger.warn("competitor_domain_keywords_failed", { domain, error: err instanceof Error ? err.message : String(err) });
      }
    }
    return { organic: [], providerName: provider.name, demo };
  }
}

function overlapSets(relatedLower: string[], ownKeywords: Set<string>) {
  const relatedSet = new Set(relatedLower);
  return {
    common: relatedLower.filter((k) => ownKeywords.has(k)),
    missing: relatedLower.filter((k) => !ownKeywords.has(k)),
    unique: [...ownKeywords].filter((k) => !relatedSet.has(k)),
  };
}

function estimateKeywordTraffic(searchVolume: number | null, position: number | null): number {
  if (searchVolume === null || searchVolume <= 0 || position === null) return 0;
  const ctr = position <= 1 ? 0.3 : position <= 3 ? 0.18 : position <= 5 ? 0.1 : position <= 10 ? 0.05 : 0.01;
  return Math.round(searchVolume * ctr);
}

function topPagesFromKeywords(
  organic: Array<{ url: string | null; keyword: string; search_volume: number | null; position: number | null }>
): Array<{ url: string; keywords: number; traffic: number }> {
  const byUrl = new Map<string, { keywords: number; traffic: number }>();
  for (const k of organic) {
    if (!k.url) continue;
    const entry = byUrl.get(k.url) ?? { keywords: 0, traffic: 0 };
    entry.keywords += 1;
    entry.traffic += estimateKeywordTraffic(k.search_volume, k.position);
    byUrl.set(k.url, entry);
  }
  return [...byUrl.entries()]
    .map(([url, v]) => ({ url, keywords: v.keywords, traffic: v.traffic }))
    .sort((a, b) => b.traffic - a.traffic || b.keywords - a.keywords)
    .slice(0, 10);
}

type CompetitorKeyword = {
  keyword: string;
  search_volume: number | null;
  difficulty: number | null;
  intent: string | null;
  position?: number | null;
  url?: string | null;
};

export const competitorService = new CompetitorService();


