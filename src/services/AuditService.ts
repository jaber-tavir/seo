import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { usageService } from "@/services/UsageService";
import { notificationService } from "@/services/NotificationService";
import { auditLogService } from "@/services/AuditLogService";
import { auditRepository } from "@/repositories/AuditRepository";
import { organizationRepository } from "@/repositories/OrganizationRepository";
import { projectRepository } from "@/repositories/ProjectRepository";
import { AUDIT_LOG_ACTIONS } from "@/constants";
import { enqueueCrawlJob } from "@/queues/crawlQueue";
import type { User } from "@/models";

export interface StartAuditInput {
  maxPages?: number;
  maxDepth?: number;
}

export interface CrawlTarget {
  url: string;
  depth: number;
}

export function normalizeForDedup(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = "";
    if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) url.port = "";
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    else url.pathname = "/";
    return url.toString();
  } catch {
    return raw.split("#")[0];
  }
}

export function splitHostPath(raw: string): { host: string; path: string } {
  try {
    const url = new URL(raw);
    return { host: url.hostname.toLowerCase(), path: `${url.pathname}${url.search}` };
  } catch {
    return { host: "", path: "/" };
  }
}

export class AuditService {
  async startAudit(user: User, projectId: string, input: StartAuditInput = {}) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new Error("Project not found");
    const allowed = await organizationRepository.canAccess(project.organization_id, user.id);
    if (!allowed) throw new Error("Project not found");

    const maxPages = Math.min(input.maxPages ?? env.CRAWLER_MAX_PAGES, env.CRAWLER_MAX_PAGES);
    const maxDepth = Math.min(input.maxDepth ?? env.CRAWLER_MAX_DEPTH, env.CRAWLER_MAX_DEPTH);

    await usageService.enforceLimit(project.organization_id, "audits", 1, "audits");
    await usageService.enforceLimit(project.organization_id, "crawled_pages", maxPages, "crawled_pages");

    const audit = await auditRepository.createAudit(project.id);
    const crawl = await auditRepository.createCrawl(audit.id, project.id);
    await usageService.consumeUsage(project.organization_id, "audits", 1);

    await auditLogService.log({
      organization_id: project.organization_id,
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.AUDIT_STARTED,
      entity_type: "audit",
      entity_id: audit.id,
    });

    const jobId = await enqueueCrawlJob({
      auditId: audit.id,
      projectId: project.id,
      organizationId: project.organization_id,
      userId: user.id,
      maxPages,
      maxDepth,
    });

    if (!jobId) {
      void this.runCrawl(audit.id, maxPages, maxDepth).catch((err: unknown) =>
        logger.error("inline_crawl_failed", { auditId: audit.id, error: err })
      );
    }

    return { audit, crawl, queued: Boolean(jobId) };
  }

  async getAuditForUser(user: User, projectId: string, auditId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new Error("Project not found");
    const allowed = await organizationRepository.canAccess(project.organization_id, user.id);
    if (!allowed) throw new Error("Project not found");
    const audit = await auditRepository.findAuditById(auditId);
    if (!audit || audit.project_id !== project.id) throw new Error("Audit not found");
    return audit;
  }
  /**
   * Core crawl loop (shared by the BullMQ worker and the inline fallback).
   * BFS over same-site links: SSRF-validated fetches, robots.txt respected,
   * per-page analysis persisted with issues, progress on the crawl row.
   */
  async runCrawl(auditId: string, maxPages: number, maxDepth: number): Promise<void> {
    const { analyzePage } = await import("@/services/crawler/analyzer");
    const { extractHtml } = await import("@/services/crawler/extractor");
    const { safeFetch } = await import("@/services/crawler/http-client");
    const { RobotsTxtParser } = await import("@/services/crawler/robots-parser");
    const { contentHash, scorePage, scoreSite } = await import("@/services/crawler/scoring");
    const { isSameSiteCrawlable, SsrfBlockedError } = await import("@/services/crawler/ssrf");
    type RobotsRules = import("@/services/crawler/robots-parser").RobotsTxtParser;

    const audit = await auditRepository.findAuditById(auditId);
    if (!audit) throw new Error(`Audit ${auditId} not found`);
    const project = await projectRepository.findById(audit.project_id);
    if (!project) throw new Error(`Project ${audit.project_id} not found`);

    const models = await import("@/models");
    const crawl = await models.Crawl.findOne({ where: { audit_id: auditId }, order: [["created_at", "DESC"]] });
    if (!crawl) throw new Error(`Crawl for audit ${auditId} not found`);

    let seedHost = "";
    try {
      seedHost = new URL(project.website_url).hostname.toLowerCase();
    } catch {
      seedHost = "";
    }
    const seedHttps = project.website_url.startsWith("https");

    await auditRepository.updateAudit(auditId, { status: "running", started_at: new Date() });
    await auditRepository.updateCrawl(crawl.id, { status: "running", started_at: new Date(), total_urls: maxPages });

    let robots: RobotsRules | null = null;
    try {
      const robotsFetch = await safeFetch(new URL("/robots.txt", project.website_url).toString(), { timeoutMs: 8000 });
      if (robotsFetch.status === 200 && robotsFetch.body) {
        robots = new RobotsTxtParser(robotsFetch.body, env.CRAWLER_USER_AGENT);
      }
    } catch {
      robots = null;
    }

    const seen = new Set<string>([normalizeForDedup(project.website_url)]);
    const queue: CrawlTarget[] = [{ url: project.website_url, depth: 0 }];

    const pageScores: number[] = [];
    const titleCounts = new Map<string, number>();
    const descCounts = new Map<string, number>();
    let processed = 0;
    let failed = 0;

    const crawlDelayMs = robots?.getCrawlDelayMs() ?? 0;
    let lastFetchAt = 0;

    while (queue.length > 0 && processed + failed < maxPages) {
      const target = queue.shift()!;
      const { host, path } = splitHostPath(target.url);
      if (host && !isSameSiteCrawlable(host, seedHost)) continue;
      if (robots && !robots.isAllowed(path || "/")) continue;

      if (crawlDelayMs > 0) {
        const wait = crawlDelayMs - (Date.now() - lastFetchAt);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      }

      let pageId: string | null = null;
      try {
        const fetched = await safeFetch(target.url);
        lastFetchAt = Date.now();
        const contentType = (fetched.headers["content-type"] ?? "").toLowerCase();
        const isHtml = contentType.includes("html") || contentType.includes("xhtml") || contentType === "";
        const extracted = isHtml && fetched.body ? extractHtml(fetched.body, fetched.finalUrl) : null;
        const xRobots = (fetched.headers["x-robots-tag"] ?? "").toLowerCase();
        const metaNoindex = extracted?.robotsMeta?.some((r) => r.includes("noindex")) ?? false;
        const indexable = fetched.status >= 200 && fetched.status < 300 && !metaNoindex && !xRobots.includes("noindex");

        let internal = 0;
        let external = 0;
        if (extracted) {
          for (const link of extracted.links) {
            try {
              const linkHost = new URL(link.href).hostname.toLowerCase();
              if (isSameSiteCrawlable(linkHost, seedHost)) internal += 1;
              else external += 1;
            } catch {
              external += 1;
            }
          }
        }

        const bodyBytes = fetched.body ? Buffer.byteLength(fetched.body, "utf8") : 0;
        const page = await auditRepository.createPage({
          crawl_id: crawl.id,
          url: target.url,
          status_code: fetched.status,
          response_time: Math.round(fetched.durationMs),
          title: extracted?.title?.slice(0, 500) ?? null,
          meta_description: extracted?.metaDescription?.slice(0, 1000) ?? null,
          h1: extracted?.h1?.[0]?.slice(0, 500) ?? null,
          canonical: extracted?.canonical?.slice(0, 2048) ?? null,
          robots: (extracted?.robotsMeta?.join(", ") ?? xRobots ?? "").slice(0, 255) || null,
          word_count: extracted?.wordCount ?? 0,
          page_size: bodyBytes,
          internal_links: internal,
          external_links: external,
          images_count: extracted?.images.length ?? 0,
          images_missing_alt: extracted?.imagesMissingAlt ?? 0,
          depth: target.depth,
          content_hash: extracted ? contentHash(extracted.textContent) : null,
          indexable,
          crawled_at: new Date(),
        });
        pageId = page.id;
        processed += 1;
        if (extracted?.title) titleCounts.set(extracted.title, (titleCounts.get(extracted.title) ?? 0) + 1);
        if (extracted?.metaDescription) descCounts.set(extracted.metaDescription, (descCounts.get(extracted.metaDescription) ?? 0) + 1);

        const checks = analyzePage({
          url: target.url,
          finalUrl: fetched.finalUrl,
          statusCode: fetched.status,
          responseTimeMs: fetched.durationMs,
          pageSizeBytes: bodyBytes,
          redirectCount: fetched.redirectCount,
          depth: target.depth,
          indexable,
          extracted,
          seedHttps,
        });
        pageScores.push(scorePage({ checks, indexable }));
        if (checks.length > 0) {
          await auditRepository.createIssues(
            checks.map((c) => ({
              audit_id: auditId,
              crawl_page_id: pageId,
              type: c.type,
              severity: c.severity,
              title: c.title.slice(0, 255),
              description: c.description,
              recommendation: c.recommendation,
              status: "open",
            }))
          );
        }

        if (extracted && target.depth < maxDepth) {
          for (const link of extracted.links) {
            let linkUrl: URL;
            try {
              linkUrl = new URL(link.href);
            } catch {
              continue;
            }
            if (linkUrl.protocol !== "http:" && linkUrl.protocol !== "https:") continue;
            if (!isSameSiteCrawlable(linkUrl.hostname.toLowerCase(), seedHost)) continue;
            const dedup = normalizeForDedup(linkUrl.toString());
            if (seen.has(dedup)) continue;
            if (seen.size >= maxPages * 4) break;
            seen.add(dedup);
            queue.push({ url: dedup, depth: target.depth + 1 });
          }
        }
      } catch (err) {
        failed += 1;
        const blocked = err instanceof SsrfBlockedError;
        logger.warn("crawl_page_failed", { auditId, url: target.url, blocked, error: err instanceof Error ? err.message : String(err) });
        if (!blocked) {
          await auditRepository.createIssues([
            {
              audit_id: auditId,
              crawl_page_id: pageId,
              type: "error",
              severity: "high",
              title: "Page could not be crawled",
              description: `Fetch failed for ${target.url}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 1000),
              recommendation: "Check that the URL is reachable and does not block crawlers.",
              status: "open",
            },
          ]);
        }
      }

      await auditRepository.updateCrawl(crawl.id, {
        processed_urls: processed,
        failed_urls: failed,
        total_urls: Math.max(maxPages, seen.size),
      });
      await auditRepository.updateAudit(auditId, { pages_crawled: processed, pages_total: Math.max(maxPages, seen.size) });
    }

    for (const [title, count] of titleCounts) {
      if (count <= 1) continue;
      await auditRepository.createIssues([
        {
          audit_id: auditId,
          crawl_page_id: null,
          type: "warning",
          severity: "medium",
          title: "Duplicate title tag",
          description: `"${title.slice(0, 120)}" appears on ${count} pages.`.slice(0, 1000),
          recommendation: "Give each page a unique, descriptive title.",
          status: "open",
        },
      ]);
    }
    for (const [, count] of descCounts) {
      if (count <= 1) continue;
      await auditRepository.createIssues([
        {
          audit_id: auditId,
          crawl_page_id: null,
          type: "warning",
          severity: "low",
          title: "Duplicate meta description",
          description: `The same meta description appears on ${count} pages.`.slice(0, 1000),
          recommendation: "Write a unique meta description per page.",
          status: "open",
        },
      ]);
    }

    const counts = await auditRepository.countBySeverity(auditId);
    const { score, healthScore } = scoreSite({ pageScores, pagesTotal: processed, errors: counts.errors, warnings: counts.warnings });

    await auditRepository.updateCrawl(crawl.id, { status: "completed", completed_at: new Date(), processed_urls: processed, failed_urls: failed });
    await auditRepository.updateAudit(auditId, {
      status: "completed",
      score,
      health_score: healthScore,
      pages_crawled: processed,
      pages_total: processed + failed,
      errors: counts.errors,
      warnings: counts.warnings,
      notices: counts.notices,
      completed_at: new Date(),
    });

    await projectRepository.update(project.id, { last_audit_at: new Date() } as never);
    await usageService.consumeUsage(project.organization_id, "crawled_pages", processed);

    await auditLogService.log({
      organization_id: project.organization_id,
      user_id: null,
      action: AUDIT_LOG_ACTIONS.AUDIT_COMPLETED,
      entity_type: "audit",
      entity_id: auditId,
      metadata: { pages: processed, score },
    });

    const members = await organizationRepository.listMembers(project.organization_id);
    for (const m of members) {
      const member = m as unknown as { user_id: string };
      await notificationService.notify({
        userId: member.user_id,
        type: "audit_completed",
        title: `Audit completed for ${project.domain}`,
        message: `Score ${score}/100 across ${processed} pages (${counts.errors} errors, ${counts.warnings} warnings).`,
      });
    }
  }
}

export const auditService = new AuditService();
