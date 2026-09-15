import { withApi, created } from "@/lib/api";
import { NotFoundError } from "@/lib/errors";
import { projectService } from "@/services/ProjectService";
import { auditService } from "@/services/AuditService";
import { auditRepository } from "@/repositories/AuditRepository";
import { startAuditSchema, auditListQuerySchema } from "@/validators/audit";

export const GET = withApi<{ projectId: string }>(
  async ({ user, params, req }) => {
    const project = await projectService.getAuthorizedProject(params.projectId, user).catch(() => null);
    if (!project) throw new NotFoundError("Project not found");
    const query = auditListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const result = await auditRepository.listAuditsForProject(project.id, query);
    return { items: result.rows.map((a) => a.toJSON()), pagination: result.pagination };
  },
  { rateLimit: { limit: 60, windowSeconds: 60 } }
);

export const POST = withApi<{ projectId: string }>(
  async ({ user, params, req }) => {
    const project = await projectService.getAuthorizedProject(params.projectId, user).catch(() => null);
    if (!project) throw new NotFoundError("Project not found");
    const body = startAuditSchema.parse(await req.json().catch(() => ({})));
    const { audit } = await auditService.startAudit(user, project.id, body);
    return created(audit.toJSON());
  },
  { rateLimit: { limit: 10, windowSeconds: 60 } }
);
