import { AUDIT_LOG_ACTIONS, KEYWORD_INTENTS, type KeywordIntent } from "@/constants"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { logger } from "@/lib/logger"
import { analyzeReadability, type ReadabilityResult } from "@/lib/readability"
import { getAiProvider, isAiEnabled } from "@/providers/ai"
import { contentRepository } from "@/repositories/ContentRepository"
import { organizationService } from "./OrganizationService"
import { auditLogService } from "./AuditLogService"
import { usageService } from "./UsageService"
import type { User } from "@/models"
import type { RequestMeta } from "./AuthService"
import type {
  AiFaqInput,
  AiOutlineInput,
  AiRewriteInput,
  AiTitleInput,
  AiTransformTextInput,
  AiDescriptionInput,
  AiToolRequest,
  ContentBriefUpdateInput,
  CreateBriefInput,
  CreateContentInput,
  UpdateContentInput,
} from "@/validators/content"

/**
 * Content service (Phase 7).
 *
 * Responsibilities:
 * - content briefs (CRUD, org-scoped)
 * - content documents (CRUD, org-scoped)
 * - AI generation through the swappable AIProvider abstraction
 * - deterministic readability analysis
 *
 * Every method returns JSON-safe plain objects: Sequelize instances are never
 * leaked across the RSC boundary (that would create circular references).
 *
 * Business rules (limits, audit logging) live here - never inside components.
 */

export interface PaginatedItems<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ContentBriefRecord {
  id: string
  project_id: string
  keyword: string
  search_intent: KeywordIntent | null
  suggested_title: string | null
  outline: string[] | null
  competitor_urls: string[] | null
  related_keywords: string[] | null
  questions: string[] | null
  created_at: string
  updated_at: string
}

export interface ContentRecord {
  id: string
  project_id: string
  title: string
  slug: string
  content: string | null
  meta_title: string | null
  meta_description: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface BriefListOptions {
  page?: number
  limit?: number
  keyword?: string
}

export interface ContentListOptions {
  page?: number
  limit?: number
  search?: string
  status?: string
}

export interface AiGenerateOptions {
  tone?: string
  language?: string
  guidelines?: string
}

/** Convert a Sequelize row into a JSON-safe plain object (no circular refs). */
function toPlain<T>(row: unknown): T {
  const model = row as { get: (options: { plain: true }) => unknown }
  return JSON.parse(JSON.stringify(model.get({ plain: true }))) as T
}

/** Only accept search intents the database ENUM supports. */
function normalizeIntent(value?: string | null): KeywordIntent | null {
  if (!value) return null
  const candidate = value.trim().toLowerCase()
  return (KEYWORD_INTENTS as readonly string[]).includes(candidate) ? (candidate as KeywordIntent) : null
}

/** Brief outlines are stored as JSON - flatten them back to text for prompts/UI. */
function outlineToText(outline: unknown): string | null {
  if (!outline) return null
  if (typeof outline === "string") return outline
  if (Array.isArray(outline)) {
    const lines = outline
      .map((item) => {
        if (typeof item === "string") return item
        const heading = (item as { heading?: unknown })?.heading
        return typeof heading === "string" ? heading : ""
      })
      .filter(Boolean)
    return lines.length > 0 ? lines.join("\n") : null
  }
  return null
}

/** The UI submits outlines as newline-separated text; store them as a JSON array. */
function textToOutline(text?: string | null): string[] | null {
  if (!text?.trim()) return null
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  return lines.length > 0 ? lines : null
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200)
}

export class ContentService {
  /** Authorization: the project must belong to the caller's organization. */
  private async getAuthorizedProject(projectId: string, user: User) {
    const { projectService } = await import("./ProjectService")
    return projectService.getAuthorizedProject(projectId, user)
  }

  // ===================================================================
  // Content briefs
  // ===================================================================

  async listContentBriefs(user: User, options: BriefListOptions = {}): Promise<PaginatedItems<ContentBriefRecord>> {
    const org = await organizationService.getPrimaryOrganization(user)
    const result = await contentRepository.findBriefsByOrganizationPaginated(org.id, {
      page: options.page ?? 1,
      pageSize: options.limit ?? 20,
      keyword: options.keyword,
    })
    return {
      items: result.rows.map((row) => toPlain<ContentBriefRecord>(row)),
      total: result.total,
      page: result.page,
      limit: result.pageSize,
      totalPages: result.totalPages,
    }
  }

  async getContentBrief(user: User, briefId: string) {
    const brief = await contentRepository.findBriefById(briefId)
    if (!brief) throw new NotFoundError("Content brief not found")
    // Ownership is resolved from the session, never from the client payload.
    await this.getAuthorizedProject(brief.project_id, user)
    return toPlain<ContentBriefRecord>(brief)
  }

  async createContentBrief(user: User, projectId: string, input: CreateBriefInput, meta: RequestMeta = {}) {
    const project = await this.getAuthorizedProject(projectId, user)
    const org = await organizationService.getPrimaryOrganization(user)

    const brief = await contentRepository.createBrief({
      project_id: project.id,
      keyword: input.keyword,
      search_intent: normalizeIntent(input.search_intent),
      suggested_title: input.suggested_title ?? null,
      outline: textToOutline(input.outline),
      competitor_urls: input.competitor_urls ?? null,
      related_keywords: input.related_keywords ?? null,
      questions: input.questions ?? null,
    })

    await auditLogService.log({
      organization_id: org.id,
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.CONTENT_BRIEF_CREATED,
      entity_type: "content_brief",
      entity_id: brief.id,
      metadata: { keyword: brief.keyword, project_id: project.id },
      ip_address: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    })

    return toPlain<ContentBriefRecord>(brief)
  }

  async updateContentBrief(
    user: User,
    briefId: string,
    updates: ContentBriefUpdateInput,
    meta: RequestMeta = {},
  ) {
    const brief = await contentRepository.findBriefById(briefId)
    if (!brief) throw new NotFoundError("Content brief not found")
    await this.getAuthorizedProject(brief.project_id, user)
    const org = await organizationService.getPrimaryOrganization(user)

    const patch: Record<string, unknown> = {}
    if (updates.keyword !== undefined) patch.keyword = updates.keyword
    if (updates.search_intent !== undefined) patch.search_intent = normalizeIntent(updates.search_intent)
    if (updates.suggested_title !== undefined) patch.suggested_title = updates.suggested_title
    if (updates.outline !== undefined) patch.outline = textToOutline(updates.outline)
    if (updates.competitor_urls !== undefined) patch.competitor_urls = updates.competitor_urls
    if (updates.related_keywords !== undefined) patch.related_keywords = updates.related_keywords
    if (updates.questions !== undefined) patch.questions = updates.questions

    if (Object.keys(patch).length === 0) throw new ValidationError("No changes provided")

    await brief.update(patch)

    await auditLogService.log({
      organization_id: org.id,
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.CONTENT_BRIEF_UPDATED,
      entity_type: "content_brief",
      entity_id: brief.id,
      metadata: { keyword: brief.keyword, fields: Object.keys(patch) },
      ip_address: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    })

    return toPlain<ContentBriefRecord>(brief)
  }

  async deleteContentBrief(user: User, briefId: string, projectId: string, meta: RequestMeta = {}) {
    const project = await this.getAuthorizedProject(projectId, user)
    const org = await organizationService.getPrimaryOrganization(user)

    const deleted = await contentRepository.deleteBrief(briefId, project.id)
    if (deleted === 0) throw new NotFoundError("Content brief not found")

    await auditLogService.log({
      organization_id: org.id,
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.CONTENT_BRIEF_DELETED,
      entity_type: "content_brief",
      entity_id: briefId,
      metadata: { project_id: project.id },
      ip_address: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    })

    return { success: true }
  }

  // ===================================================================
  // Content documents
  // ===================================================================

  /** Guarantee a unique slug inside a project. */
  private async uniqueSlug(projectId: string, title: string, excludeId?: string): Promise<string> {
    const base = generateSlug(title) || "untitled"
    let candidate = base
    for (let i = 2; i <= 50; i += 1) {
      const existing = await contentRepository.findContentBySlug(projectId, candidate)
      if (!existing || existing.id === excludeId) return candidate
      candidate = `${base}-${i}`
    }
    return `${base}-${Date.now().toString(36)}`
  }

  async listContentDocuments(
    user: User,
    options: ContentListOptions = {},
  ): Promise<PaginatedItems<ContentRecord>> {
    const org = await organizationService.getPrimaryOrganization(user)
    const result = await contentRepository.findContentsByOrganizationPaginated(org.id, {
      page: options.page ?? 1,
      pageSize: options.limit ?? 20,
      search: options.search,
      status: options.status,
    })
    return {
      items: result.rows.map((row) => toPlain<ContentRecord>(row)),
      total: result.total,
      page: result.page,
      limit: result.pageSize,
      totalPages: result.totalPages,
    }
  }

  async getContentDocument(user: User, documentId: string) {
    const doc = await contentRepository.findContentById(documentId)
    if (!doc) throw new NotFoundError("Content document not found")
    await this.getAuthorizedProject(doc.project_id, user)
    return toPlain<ContentRecord>(doc)
  }

  async createContentDocument(user: User, projectId: string, input: CreateContentInput, meta: RequestMeta = {}) {
    const project = await this.getAuthorizedProject(projectId, user)
    const org = await organizationService.getPrimaryOrganization(user)

    const doc = await contentRepository.createContent({
      project_id: project.id,
      title: input.title,
      slug: await this.uniqueSlug(project.id, input.title),
      content: input.content ?? null,
      meta_title: input.meta_title ?? null,
      meta_description: input.meta_description ?? null,
      status: input.status ?? "draft",
    })

    await auditLogService.log({
      organization_id: org.id,
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.CONTENT_DOCUMENT_CREATED,
      entity_type: "content",
      entity_id: doc.id,
      metadata: { title: doc.title, slug: doc.slug, project_id: project.id },
      ip_address: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    })

    return toPlain<ContentRecord>(doc)
  }

  async updateContentDocument(
    user: User,
    documentId: string,
    updates: UpdateContentInput,
    meta: RequestMeta = {},
  ) {
    const existing = await contentRepository.findContentById(documentId)
    if (!existing) throw new NotFoundError("Content document not found")
    const project = await this.getAuthorizedProject(existing.project_id, user)
    const org = await organizationService.getPrimaryOrganization(user)

    const patch: Record<string, unknown> = {}
    if (updates.title !== undefined) {
      patch.title = updates.title
      patch.slug = await this.uniqueSlug(project.id, updates.title, documentId)
    }
    if (updates.content !== undefined) patch.content = updates.content
    if (updates.meta_title !== undefined) patch.meta_title = updates.meta_title
    if (updates.meta_description !== undefined) patch.meta_description = updates.meta_description
    if (updates.status !== undefined) patch.status = updates.status

    if (Object.keys(patch).length === 0) throw new ValidationError("No changes provided")

    const updated = await contentRepository.updateContent(documentId, project.id, patch)
    if (!updated) throw new NotFoundError("Content document not found")

    await auditLogService.log({
      organization_id: org.id,
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.CONTENT_DOCUMENT_UPDATED,
      entity_type: "content",
      entity_id: documentId,
      metadata: { title: updated.title, status: updated.status, fields: Object.keys(patch) },
      ip_address: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    })

    return toPlain<ContentRecord>(updated)
  }

  async deleteContentDocument(user: User, documentId: string, meta: RequestMeta = {}) {
    const existing = await contentRepository.findContentById(documentId)
    if (!existing) throw new NotFoundError("Content document not found")
    const project = await this.getAuthorizedProject(existing.project_id, user)
    const org = await organizationService.getPrimaryOrganization(user)

    const deleted = await contentRepository.deleteContent(documentId, project.id)
    if (deleted === 0) throw new NotFoundError("Content document not found")

    await auditLogService.log({
      organization_id: org.id,
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.CONTENT_DOCUMENT_DELETED,
      entity_type: "content",
      entity_id: documentId,
      metadata: { project_id: project.id, title: existing.title },
      ip_address: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    })

    return { success: true }
  }

  // ===================================================================
  // AI generation - every call goes through the AIProvider abstraction
  // ===================================================================

    /**
   * Resolve the configured AI provider.
   *
   * Without AI_API_KEY the deterministic mock provider is used and every
   * response is flagged with `demo: true`, so demo output is never passed off
   * as real AI research (see src/providers/ai).
   */
  private resolveAi() {
    const handle = getAiProvider()
    if (handle.demo) {
      logger.warn("ai_provider_mock_in_use", {
        hint: "Set AI_API_KEY for live AI content generation.",
      })
    }
    return handle
  }

  /** True when a real AI provider is configured (used to label the UI). */
  isAiConfigured(): boolean {
    return isAiEnabled()
  }

  /** Enforce + consume the plan's AI generation allowance (DB-driven limits). */
  private async consumeAiUsage(user: User, label: string) {
    const org = await organizationService.getPrimaryOrganization(user)
    await usageService.enforceLimit(org.id, "ai_generations", 1, label)
    await usageService.consumeUsage(org.id, "ai_generations", 1)
    return org
  }

  /** Generate a full article from a brief and store it as a draft document. */
  async generateContentWithAi(
    user: User,
    briefId: string,
    options: AiGenerateOptions = {},
    meta: RequestMeta = {},
  ) {
    const brief = await contentRepository.findBriefById(briefId)
    if (!brief) throw new NotFoundError("Content brief not found")
    const project = await this.getAuthorizedProject(brief.project_id, user)

    const { provider, name } = this.resolveAi()
    const org = await this.consumeAiUsage(user, "AI content generations")

    const result = await provider.generateContent({
      keyword: brief.keyword,
      search_intent: brief.search_intent,
      suggested_title: brief.suggested_title,
      outline: outlineToText(brief.outline),
      competitor_urls: brief.competitor_urls,
      related_keywords: brief.related_keywords,
      questions: brief.questions,
      tone: options.tone ?? "informative",
      language: options.language ?? "en",
      guidelines: options.guidelines,
    })

    const article = result.content ?? result.text ?? null
    if (!article) throw new ValidationError("The AI provider returned no content")

    const title = brief.suggested_title ?? brief.keyword
    const doc = await contentRepository.createContent({
      project_id: project.id,
      title,
      slug: await this.uniqueSlug(project.id, title),
      content: article,
      meta_title: result.meta_title ?? null,
      meta_description: result.meta_description ?? null,
      status: "draft",
    })

    await auditLogService.log({
      organization_id: org.id,
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.CONTENT_GENERATED,
      entity_type: "content",
      entity_id: doc.id,
      metadata: {
        brief_id: briefId,
        keyword: brief.keyword,
        provider: name,
        token_count: result.token_count ?? null,
      },
      ip_address: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    })

    return { ...toPlain<ContentRecord>(doc), provider: name, demo: provider.demo }
  }

  /** Research a topic with AI and persist the result as a content brief. */
  async buildBriefWithAi(
    user: User,
    projectId: string,
    input: { keyword: string; related_keywords?: string[]; competitor_urls?: string[] },
    meta: RequestMeta = {},
  ) {
    const project = await this.getAuthorizedProject(projectId, user)
    const { provider, name } = this.resolveAi()
    const org = await this.consumeAiUsage(user, "AI content briefs")

    const result = await provider.generateBrief({
      keyword: input.keyword,
      relatedKeywords: input.related_keywords,
      competitorUrls: input.competitor_urls,
    })

    const brief = await contentRepository.createBrief({
      project_id: project.id,
      keyword: input.keyword,
      search_intent: normalizeIntent(result.search_intent),
      suggested_title: result.suggested_title,
      outline: result.outline.map((section) => section.heading),
      competitor_urls: input.competitor_urls ?? null,
      related_keywords: input.related_keywords ?? null,
      questions: result.questions,
    })

    await auditLogService.log({
      organization_id: org.id,
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.CONTENT_BRIEF_CREATED,
      entity_type: "content_brief",
      entity_id: brief.id,
      metadata: { keyword: input.keyword, project_id: project.id, provider: name, source: "ai" },
      ip_address: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    })

    return { ...toPlain<ContentBriefRecord>(brief), summary: result.summary, provider: name, demo: provider.demo }
  }

  /**
   * Run a single AI content tool.
   *
   * Authenticated callers consume one AI generation from their (DB-driven) plan
   * allowance; anonymous public-tool callers are protected by the route's IP
   * rate limit instead, because no plan applies to them.
   */
  async runAiTool(payload: AiToolRequest, user: User | null, meta: RequestMeta = {}) {
    const { provider, name, demo } = this.resolveAi()

    if (user) {
      const org = await this.consumeAiUsage(user, "AI generations")
      await auditLogService.log({
        organization_id: org.id,
        user_id: user.id,
        action: AUDIT_LOG_ACTIONS.CONTENT_GENERATED,
        entity_type: "ai_tool",
        entity_id: null,
        metadata: { tool: payload.tool, provider: name },
        ip_address: meta.ip ?? null,
        user_agent: meta.userAgent ?? null,
      })
    }

    const base = { provider: name, demo }

    switch (payload.tool) {
      case "title":
        return {
          ...base,
          titles: await provider.generateTitle({
            keyword: payload.keyword,
            tone: payload.tone,
            count: payload.count,
          }),
        }
      case "description":
        return {
          ...base,
          descriptions: await provider.generateDescription({
            keyword: payload.keyword,
            target: payload.target,
            count: payload.count,
          }),
        }
      case "outline":
        return {
          ...base,
          outline: await provider.generateOutline({
            keyword: payload.keyword,
            intent: payload.intent,
            sections: payload.sections,
          }),
        }
      case "faq":
        return {
          ...base,
          questions: await provider.generateFaq({ topic: payload.topic, count: payload.count }),
        }
      case "rewrite":
        return { ...base, text: await provider.rewrite({ text: payload.text, tone: payload.tone }) }
      case "expand":
        return { ...base, text: await provider.expand({ text: payload.text }) }
      case "shorten":
        return {
          ...base,
          text: await provider.shorten({ text: payload.text, targetLength: payload.targetLength }),
        }
      case "brief":
      case "content": {
        const result = await provider.generateContent({
          keyword: payload.keyword,
          search_intent: payload.search_intent,
          tone: payload.tone,
          language: payload.language,
          outline: payload.outline,
          competitor_urls: payload.competitor_urls,
          related_keywords: payload.related_keywords,
          questions: payload.questions,
        })
        return { ...base, ...result }
      }
      default:
        throw new ValidationError("Unknown AI tool")
    }
  }

  // ===================================================================
  // Project-scoped listings (used by the project content page/API)
  // ===================================================================

  async listProjectBriefs(
    user: User,
    projectId: string,
    options: BriefListOptions = {},
  ): Promise<PaginatedItems<ContentBriefRecord>> {
    const project = await this.getAuthorizedProject(projectId, user)
    const result = await contentRepository.listBriefs(project.id, {
      page: options.page ?? 1,
      pageSize: options.limit ?? 20,
      keyword: options.keyword,
    })
    return {
      items: result.rows.map((row) => toPlain<ContentBriefRecord>(row)),
      total: result.total,
      page: result.page,
      limit: result.pageSize,
      totalPages: result.totalPages,
    }
  }

  async listProjectDocuments(
    user: User,
    projectId: string,
    options: ContentListOptions = {},
  ): Promise<PaginatedItems<ContentRecord>> {
    const project = await this.getAuthorizedProject(projectId, user)
    const result = await contentRepository.listContents(project.id, {
      page: options.page ?? 1,
      pageSize: options.limit ?? 20,
      search: options.search,
      status: options.status,
    })
    return {
      items: result.rows.map((row) => toPlain<ContentRecord>(row)),
      total: result.total,
      page: result.page,
      limit: result.pageSize,
      totalPages: result.totalPages,
    }
  }

  /** Deterministic readability analysis - no AI call, no external service. */
  analyzeText(text: string): ReadabilityResult {
    return analyzeReadability(text)
  }
}

export const contentService = new ContentService()
