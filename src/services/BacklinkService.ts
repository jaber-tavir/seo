import { AUDIT_LOG_ACTIONS } from "@/constants";
import { ExternalApiError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { Backlink, ReferringDomain, type Project, type User } from "@/models";
import { getBacklinkProvider } from "@/providers/backlink";
import { backlinkRepository } from "@/repositories/BacklinkRepository";
import { projectRepository } from "@/repositories/ProjectRepository";
import { organizationRepository } from "@/repositories/OrganizationRepository";
import { auditLogService } from "./AuditLogService";
import { notificationService } from "./NotificationService";
import type { RequestMeta } from "./AuthService";
import type { BacklinkListQuery } from "@/validators/backlink";

export interface BacklinkOverview {
  summary: { total: number; referring_domains: number; dofollow: number; nofollow: number };
  counts: { active: number; lost: number; dofollow: number; nofollow: number };
  provider: string;
  demo: boolean;
  synced_at: string | null;
}

async function getAuthorizedProject(projectId: string, user: User): Promise<Project> {
  const project = await projectRepository.findById(projectId);
  if (!project) throw new NotFoundError("Project not found");
  const allowed = await organizationRepository.canAccess(project.organization_id, user.id);
  if (!allowed) throw new NotFoundError("Project not found");
  return project;
}

/**
 * Backlink service. Metrics come from the configured BacklinkProvider
 * (mock in dev, DataForSEO when credentials are set) and are snapshotted
 * into MySQL so new/lost detection, anchors and referring domains work
 * without re-hitting the external API on every page view.
 */
export class BacklinkService {
  async overview(user: User, projectId: string): Promise<BacklinkOverview> {
    const project = await getAuthorizedProject(projectId, user);
    const counts = await backlinkRepository.countByStatus(project.id);
    const domains = await backlinkRepository.listReferringDomains(project.id, 1, 1);
    const latest = await Backlink.findOne({
      where: { project_id: project.id },
      order: [["last_seen", "DESC"]],
      attributes: ["last_seen"],
    });
    const provider = getBacklinkProvider();
    return {
      summary: {
        total: counts.active,
        referring_domains: domains.pagination.total,
        dofollow: counts.dofollow,
        nofollow: counts.nofollow,
      },
      counts,
      provider: provider.name,
      demo: provider.name === "mock",
      synced_at: latest?.last_seen ? latest.last_seen.toISOString() : null,
    };
  }

  async listBacklinks(user: User, projectId: string, query: BacklinkListQuery) {
    const project = await getAuthorizedProject(projectId, user);
    const view = query.view ?? "all";
    if (view === "referring-domains") {
      const page = await backlinkRepository.listReferringDomains(project.id, query.page, query.pageSize, query.search);
      return { kind: "referring-domains" as const, rows: page.rows.map((r) => r.toJSON()), pagination: page.pagination };
    }
    if (view === "anchors") {
      const rows = await backlinkRepository.anchorDistribution(project.id, 50);
      return { kind: "anchors" as const, rows, pagination: { total: rows.length, page: 1, pageSize: 50, totalPages: 1 } };
    }
    if (view === "new") {
      const rows = await backlinkRepository.newSince(project.id, query.days);
      const mapped = rows.map((r) => r.toJSON());
      return { kind: "backlinks" as const, rows: mapped, pagination: { total: mapped.length, page: 1, pageSize: mapped.length || 1, totalPages: 1 } };
    }
    const page = await backlinkRepository.listByProject(project.id, {
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      status: view === "lost" ? "lost" : (query.status ?? (view === "all" ? undefined : "active")),
      linkType: query.link_type,
      anchor: query.anchor,
      sort: query.sort,
      order: query.order,
    });
    return { kind: "backlinks" as const, rows: page.rows.map((r) => r.toJSON()), pagination: page.pagination };
  }

  /** Pull the latest snapshot from the provider and reconcile new/lost rows. */
  async refresh(user: User, projectId: string, limit = 100, meta: RequestMeta = {}) {
    const project = await getAuthorizedProject(projectId, user);
    const provider = getBacklinkProvider();
    let snapshot;
    try {
      snapshot = await provider.getBacklinks(project.domain, { limit, status: "all" });
    } catch (err) {
      logger.warn("backlink_refresh_failed", { projectId, error: err instanceof Error ? err.message : String(err) });
      throw new ExternalApiError("Backlink provider request failed. Please try again later.");
    }

    const knownKeys = new Set(
      (await Backlink.findAll({ where: { project_id: project.id }, attributes: ["source_url", "target_url"] })).map(
        (b) => `${b.source_url}||${b.target_url}`
      )
    );
    const keepKeys = new Set<string>();
    let added = 0;
    for (const item of snapshot.backlinks) {
      if (item.is_lost) continue;
      const key = `${item.source_url}||${item.target_url}`;
      keepKeys.add(key);
      const existed = knownKeys.has(key);
      await backlinkRepository.upsert({
        project_id: project.id,
        source_url: item.source_url,
        target_url: item.target_url,
        anchor_text: item.anchor_text,
        domain: item.domain,
        domain_authority: item.domain_authority,
        link_type: item.link_type,
        status: "active",
        first_seen: item.first_seen,
        last_seen: item.last_seen ?? new Date(),
      });
      if (!existed) added += 1;
    }
    const lost = await backlinkRepository.markLost(project.id, keepKeys);
    await backlinkRepository.rebuildReferringDomains(project.id);

    if (added > 0) {
      await notificationService.notify({
        userId: user.id,
        type: "backlink_new",
        title: `${added} new backlink${added === 1 ? "" : "s"} found`,
        message: `${project.domain} gained ${added} new backlink${added === 1 ? "" : "s"} (${provider.name}).`,
      });
    }
    if (lost > 0) {
      await notificationService.notify({
        userId: user.id,
        type: "backlink_lost",
        title: `${lost} backlink${lost === 1 ? "" : "s"} lost`,
        message: `${project.domain} lost ${lost} backlink${lost === 1 ? "" : "s"} since the last sync.`,
      });
    }

    await auditLogService.log({
      organization_id: project.organization_id,
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.BACKLINKS_SYNCED,
      entity_type: "project",
      entity_id: project.id,
      metadata: { added, lost, provider: provider.name },
      ip_address: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    });

    logger.info("backlinks_synced", { projectId, added, lost, provider: provider.name });
    const counts = await backlinkRepository.countByStatus(project.id);
    return { added, lost, counts, provider: provider.name, demo: provider.name === "mock" };
  }

  /** Backlink gap: referring domains linking to competitors but not to us. */
  async gap(user: User, projectId: string, competitorDomains: string[]) {
    const project = await getAuthorizedProject(projectId, user);
    const provider = getBacklinkProvider();
    const ownRows = await ReferringDomain.findAll({ where: { project_id: project.id }, attributes: ["domain"] });
    const ownDomains = new Set(ownRows.map((r) => r.domain.toLowerCase()));
    const domains = [...new Set(competitorDomains.map((d) => d.toLowerCase().trim()).filter(Boolean))].slice(0, 5);
    const gaps: Array<{ domain: string; backlinks: number; sample: Array<{ source_url: string; anchor_text: string | null }> }> = [];
    for (const domain of domains) {
      let rows: Array<{ source_url: string; anchor_text: string | null; domain: string }> = [];
      try {
        const res = await provider.getBacklinks(domain, { limit: 50, status: "all" });
        rows = res.backlinks.filter((b) => !b.is_lost);
      } catch (err) {
        logger.warn("backlink_gap_failed", { domain, error: err instanceof Error ? err.message : String(err) });
        continue;
      }
      const missing = rows.filter((b) => !ownDomains.has(b.domain.toLowerCase()));
      gaps.push({
        domain,
        backlinks: missing.length,
        sample: missing.slice(0, 10).map((b) => ({ source_url: b.source_url, anchor_text: b.anchor_text })),
      });
    }
    gaps.sort((a, b) => b.backlinks - a.backlinks);
    return { project: { id: project.id, domain: project.domain }, gaps };
  }
}

export const backlinkService = new BacklinkService();

