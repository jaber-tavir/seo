import { withApi } from "@/lib/api";
import { NotFoundError } from "@/lib/errors";
import { projectService } from "@/services/ProjectService";
import { auditService } from "@/services/AuditService";
import { auditRepository } from "@/repositories/AuditRepository";
import { paginationSchema } from "@/validators/common";

export const GET = withApi<{ projectId: string; auditId: string }>(
  async ({ user, params, req }) => {
    const project = await projectService.getAuthorizedProject(params.projectId, user).catch(() => null);
    if (!project) throw new NotFoundError("Project not found");
    const audit = await auditService.getAuditForUser(user, project.id, params.auditId).catch(() => null);
    if (!audit) throw new NotFoundError("Audit not found");
    const models = await import("@/models");
    const crawl = await models.Crawl.findOne({ where: { audit_id: audit.id }, order: [["created_at", "DESC"]] });
    if (!crawl) throw new NotFoundError("Crawl not found");
    const query = paginationSchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const result = await auditRepository.listPages(crawl.id, query);
    return { items: result.rows.map((p) => p.toJSON()), pagination: result.pagination };
  },
  { rateLimit: { limit: 120, windowSeconds: 60 } }
);
