import { withApi } from "@/lib/api";
import { NotFoundError } from "@/lib/errors";
import { projectService } from "@/services/ProjectService";
import { auditService } from "@/services/AuditService";
import { auditRepository } from "@/repositories/AuditRepository";
import { issueListQuerySchema } from "@/validators/audit";

export const GET = withApi<{ projectId: string; auditId: string }>(
  async ({ user, params, req }) => {
    const project = await projectService.getAuthorizedProject(params.projectId, user).catch(() => null);
    if (!project) throw new NotFoundError("Project not found");
    const audit = await auditService.getAuditForUser(user, project.id, params.auditId).catch(() => null);
    if (!audit) throw new NotFoundError("Audit not found");
    const query = issueListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const result = await auditRepository.listIssues(audit.id, query);
    return { items: result.rows.map((i) => i.toJSON()), pagination: result.pagination };
  },
  { rateLimit: { limit: 120, windowSeconds: 60 } }
);
