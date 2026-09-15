import { withApi } from "@/lib/api";
import { NotFoundError } from "@/lib/errors";
import { projectService } from "@/services/ProjectService";
import { auditService } from "@/services/AuditService";
import { auditRepository } from "@/repositories/AuditRepository";

export const GET = withApi<{ projectId: string; auditId: string }>(
  async ({ user, params }) => {
    const project = await projectService.getAuthorizedProject(params.projectId, user).catch(() => null);
    if (!project) throw new NotFoundError("Project not found");
    const audit = await auditService.getAuditForUser(user, project.id, params.auditId).catch(() => null);
    if (!audit) throw new NotFoundError("Audit not found");
    const models = await import("@/models");
    const crawl = await models.Crawl.findOne({ where: { audit_id: audit.id }, order: [["created_at", "DESC"]] });
    const counts = await auditRepository.countBySeverity(audit.id);
    return { audit: audit.toJSON(), crawl: crawl?.toJSON() ?? null, counts };
  },
  { rateLimit: { limit: 120, windowSeconds: 60 } }
);
