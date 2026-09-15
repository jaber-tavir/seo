const fs = require('fs');

const part2 = `
  // ============================ Content Documents ============================

  async listContentDocuments(
    user: { organization_id: string },
    options?: { page?: number; limit?: number; search?: string; status?: string },
  ) {
    return contentRepository.findContentsByOrganizationPaginated(user.organization_id, {
      page: options?.page ?? 1,
      limit: options?.limit ?? 20,
      search: options?.search,
      status: options?.status,
    })
  }

  async getContentDocument(user: { organization_id: string }, documentId: string) {
    const doc = await contentRepository.findContentById(documentId)
    if (!doc) throw new NotFoundError("Content document not found")
    if (doc.project && doc.project.organization_id !== user.organization_id) {
      throw new NotFoundError("Content document not found")
    }
    return doc
  }

  async createContentDocument(
    user: { id: string; organization_id: string },
    projectId: string,
    createData: {
      title: string
      slug?: string
      content?: string
      meta_title?: string
      meta_description?: string
      status?: string
    },
  ) {
    const project = await this.getAuthorizedProject(projectId, user)
    const slug = createData.slug ?? this.generateSlug(createData.title)

    const doc = await contentRepository.createContent({
      project_id: project.id,
      title: createData.title,
      slug,
      content: createData.content ?? null,
      meta_title: createData.meta_title ?? null,
      meta_description: createData.meta_description ?? null,
      status: createData.status ?? "draft",
    })

    await auditLogService.log(user.organization_id, user.id, "content_document.created", doc.id, {
      title: doc.title,
      slug: doc.slug,
      project_id: project.id,
    })

    return doc
  }

  async updateContentDocument(
    user: { id: string; organization_id: string },
    documentId: string,
    updates: {
      title?: string
      slug?: string
      content?: string
      meta_title?: string
      meta_description?: string
      status?: string
    },
  ) {
    const doc = await contentRepository.findContentById(documentId)
    if (!doc) throw new NotFoundError("Content document not found")
    if (doc.project && doc.project.organization_id !== user.organization_id) {
      throw new NotFoundError("Content document not found")
    }

    const updatedData: Record<string, unknown> = {}
    if (updates.title !== undefined) updatedData.title = updates.title
    if (updates.slug !== undefined) updatedData.slug = updates.slug
    if (updates.content !== undefined) updatedData.content = updates.content
    if (updates.meta_title !== undefined) updatedData.meta_title = updates.meta_title
    if (updates.meta_description !== undefined) updatedData.meta_description = updates.meta_description
    if (updates.status !== undefined) updatedData.status = updates.status

    const updated = await doc.update(updatedData)

    await auditLogService.log(user.organization_id, user.id, "content_document.updated", documentId, {
      title: updated.title,
      status: updated.status,
    })

    return updated
  }

  async deleteContentDocument(user: { organization_id: string }, documentId: string) {
    const doc = await contentRepository.findContentById(documentId)
    if (!doc) throw new NotFoundError("Content document not found")
    if (doc.project && doc.project.organization_id !== user.organization_id) {
      throw new NotFoundError("Content document not found")
    }
    const deleted = await contentRepository.deleteContent(documentId, doc.project_id)
    if (deleted === 0) throw new NotFoundError("Content document not found")
    await auditLogService.log(user.organization_id, "system", "content_document.deleted", documentId, {})
    return { success: true }
  }

  // ============================ AI-Generated Content ============================

  async generateContentWithAi(
    user: { id: string; organization_id: string },
    briefId: string,
    options: { tone?: string; language?: string; guidelines?: string } = {},
  ) {
    const brief = await contentRepository.findBriefById(briefId)
    if (!brief) throw new NotFoundError("Content brief not found")
    if (brief.project && brief.project.organization_id !== user.organization_id) {
      throw new NotFoundError("Content brief not found")
    }

    const provider = getAIProvider()

    const result = await provider.generateContent({
      keyword: brief.keyword,
      search_intent: brief.search_intent,
      suggested_title: brief.suggested_title,
      outline: brief.outline as string | null,
      competitor_urls: brief.competitor_urls,
      related_keywords: brief.related_keywords,
      questions: brief.questions,
      tone: options.tone ?? "informative",
      language: options.language ?? "en",
      guidelines: options.guidelines,
    })

    const project = await this.getAuthorizedProject(brief.project_id, user)
    const slug = this.generateSlug(brief.suggested_title ?? brief.keyword)

    const doc = await contentRepository.createContent({
      project_id: project.id,
      title: brief.suggested_title ?? brief.keyword,
      slug,
      content: result.content ?? result.text ?? null,
      meta_title: result.meta_title ?? null,
      meta_description: result.meta_description ?? null,
      status: "draft",
    })

    await auditLogService.log(user.organization_id, user.id, "content_document.generated", doc.id, {
      brief_id: briefId,
      keyword: brief.keyword,
      provider: result.provider ?? "unknown",
      token_count: result.token_count ?? null,
    })

    return doc
  }
}

export const contentService = new ContentService()
`;

fs.writeFileSync('_part2.ts', part2);
console.log('Written part2', part2.length, 'bytes');
