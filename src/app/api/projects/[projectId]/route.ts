import { ok, withApi } from "@/lib/api";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { projectService } from "@/services/ProjectService";
import { updateProjectSchema } from "@/validators/project";

export const dynamic = "force-dynamic";

type Params = { projectId: string };

function validateParams(params: Params): Params {
  if (!params?.projectId) throw new NotFoundError("Project not found");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.projectId)) {
    throw new NotFoundError("Project not found");
  }
  return params;
}

export const GET = withApi<Params>(async ({ params, user }) => {
  validateParams(params);
  const dashboard = await projectService.getProjectDashboard(user, params.projectId);
  return ok({
    project: dashboard.project.toJSON(),
    stats: dashboard.stats,
    latest_audit: dashboard.latestAudit ? dashboard.latestAudit.toJSON() : null,
  });
});

export const PATCH = withApi<Params>(async ({ req, params, user }) => {
  validateParams(params);
  const body = await req.json().catch(() => null);
  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError("Invalid project data", parsed.error.issues);

  const project = await projectService.updateProject(user, params.projectId, parsed.data);
  return ok({ project: project.toJSON() });
});

export const DELETE = withApi<Params>(async ({ params, user }) => {
  validateParams(params);
  const result = await projectService.deleteProject(user, params.projectId);
  return ok(result);
});
