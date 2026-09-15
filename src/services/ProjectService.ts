import { AUDIT_LOG_ACTIONS, type ProjectStatus, type SearchEngine } from "@/constants";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { extractDomain, isLikelyPublicDomain, normalizeWebsiteUrl } from "@/lib/url";
import { organizationRepository } from "@/repositories/OrganizationRepository";
import { projectRepository } from "@/repositories/ProjectRepository";
import { organizationService } from "./OrganizationService";
import { auditLogService } from "./AuditLogService";
import { usageService } from "./UsageService";
import type { RequestMeta } from "./AuthService";
import type { User } from "@/models";

export interface CreateProjectInput {
  name: string;
  website_url: string;
  country?: string;
  language?: string;
  search_engine?: SearchEngine;
  sitemap_url?: string;
}

export interface UpdateProjectInput {
  name?: string;
  website_url?: string;
  country?: string;
  language?: string;
  search_engine?: SearchEngine;
  sitemap_url?: string | null;
  status?: ProjectStatus;
}

/**
 * Project service. All access is scoped to the authenticated user's
 * organization - a user can never read or modify another tenant's projects.
 */
export class ProjectService {
  async createProject(user: User, input: CreateProjectInput, meta: RequestMeta = {}) {
    const org = await organizationService.getPrimaryOrganization(user);

    const normalized = normalizeWebsiteUrl(input.website_url);
    if (!normalized) throw new ValidationError("Please provide a valid website URL (e.g. https://example.com)");

    const domain = extractDomain(normalized);
    if (!domain || !isLikelyPublicDomain(domain)) {
      throw new ValidationError("Please provide a public website URL (localhost and IP addresses are not allowed)");
    }

    if (await projectRepository.existsByOrgAndDomain(org.id, domain)) {
      throw new ConflictError("A project for this domain already exists in your organization");
    }

    // Plan limit check (central UsageService - limits come from the DB plan)
    await usageService.enforceLimit(org.id, "projects", 1, "projects");

    const project = await projectRepository.create({
      organization_id: org.id,
      name: input.name,
      website_url: normalized,
      domain,
      country: input.country ?? "us",
      language: input.language ?? "en",
      search_engine: input.search_engine ?? "google",
      sitemap_url: input.sitemap_url ?? null,
    });

    await auditLogService.log({
      organization_id: org.id,
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.PROJECT_CREATED,
      entity_type: "project",
      entity_id: project.id,
      metadata: { name: project.name, domain: project.domain },
      ip_address: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    });

    return project;
  }

  async listProjects(user: User, filters?: { page?: number; pageSize?: number; search?: string; status?: ProjectStatus }) {
    const org = await organizationService.getPrimaryOrganization(user);
    return projectRepository.listByOrganization(org.id, filters);
  }

  /**
   * Ownership-aware project fetch. Returns 404 (not 403) when the project
   * belongs to another organization so existence is never revealed.
   */
  async getAuthorizedProject(projectId: string, user: User) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new NotFoundError("Project not found");

    const allowed = await organizationRepository.canAccess(project.organization_id, user.id);
    if (!allowed) throw new NotFoundError("Project not found");

    return project;
  }

  async updateProject(user: User, projectId: string, input: UpdateProjectInput, meta: RequestMeta = {}) {
    const project = await this.getAuthorizedProject(projectId, user);

    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.status !== undefined) updates.status = input.status;
    if (input.country !== undefined) updates.country = input.country;
    if (input.language !== undefined) updates.language = input.language;
    if (input.search_engine !== undefined) updates.search_engine = input.search_engine;
    if (input.sitemap_url !== undefined) updates.sitemap_url = input.sitemap_url ?? null;
    if (input.website_url !== undefined) {
      const normalized = normalizeWebsiteUrl(input.website_url);
      if (!normalized) throw new ValidationError("Please provide a valid website URL");
      const domain = extractDomain(normalized);
      if (!domain || !isLikelyPublicDomain(domain)) throw new ValidationError("Please provide a public website URL");
      if (await projectRepository.existsByOrgAndDomain(project.organization_id, domain, project.id)) {
        throw new ConflictError("A project for this domain already exists in your organization");
      }
      updates.website_url = normalized;
      updates.domain = domain;
    }

    const updated = await projectRepository.updateById(project.id, updates);
    if (!updated) throw new NotFoundError("Project not found");

    await auditLogService.log({
      organization_id: project.organization_id,
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.PROJECT_UPDATED,
      entity_type: "project",
      entity_id: project.id,
      metadata: { updates: Object.keys(updates) },
      ip_address: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    });

    return updated;
  }

  async deleteProject(user: User, projectId: string, meta: RequestMeta = {}) {
    const project = await this.getAuthorizedProject(projectId, user);
    await projectRepository.delete(project.id);
    await auditLogService.log({
      organization_id: project.organization_id,
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.PROJECT_DELETED,
      entity_type: "project",
      entity_id: project.id,
      metadata: { name: project.name, domain: project.domain },
      ip_address: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    });
    return { id: project.id };
  }

  /** Dashboard data for a single project (all counts are real queries) */
  async getProjectDashboard(user: User, projectId: string) {
    const project = await this.getAuthorizedProject(projectId, user);
    const [stats, latestAudit] = await Promise.all([
      projectRepository.getProjectStats(project.id),
      (await import("@/models")).SiteAudit.findOne({
        where: { project_id: project.id },
        order: [["created_at", "DESC"]],
      }),
    ]);
    return { project, stats, latestAudit };
  }

}

export const projectService = new ProjectService();
