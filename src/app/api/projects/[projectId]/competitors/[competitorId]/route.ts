import { ok, withApi } from "@/lib/api";
import { NotFoundError } from "@/lib/errors";
import { competitorService } from "@/services/CompetitorService";

export const dynamic = "force-dynamic";

type Params = { projectId: string; competitorId: string };

function validateParams(params: Params): Params {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!params?.projectId || !uuid.test(params.projectId)) throw new NotFoundError("Project not found");
  if (!params?.competitorId || !uuid.test(params.competitorId)) throw new NotFoundError("Competitor not found");
  return params;
}

/** GET /api/projects/[projectId]/competitors/[competitorId] - full analysis */
export const GET = withApi<Params>(async ({ params, user }) => {
  validateParams(params);
  return ok(await competitorService.analyzeCompetitor(user, params.projectId, params.competitorId));
});

/** DELETE /api/projects/[projectId]/competitors/[competitorId] - stop tracking */
export const DELETE = withApi<Params>(async ({ params, user, req }) => {
  validateParams(params);
  const meta = { ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") };
  return ok(await competitorService.deleteCompetitor(user, params.projectId, params.competitorId, meta));
});
