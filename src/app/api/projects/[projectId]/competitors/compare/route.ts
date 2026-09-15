import { ok, withApi } from "@/lib/api";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { competitorService } from "@/services/CompetitorService";
import { compareCompetitorsSchema } from "@/validators/competitor";

export const dynamic = "force-dynamic";

type Params = { projectId: string };

/** POST /api/projects/[projectId]/competitors/compare - Website vs Competitor 1 vs Competitor 2 */
export const POST = withApi<Params>(async ({ params, user, req }) => {
  if (!params?.projectId) throw new NotFoundError("Project not found");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.projectId)) {
    throw new NotFoundError("Project not found");
  }
  const body = await req.json().catch(() => null);
  const parsed = compareCompetitorsSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError("Invalid comparison", parsed.error.issues);

  return ok(await competitorService.compareCompetitors(user, params.projectId, parsed.data.competitor_ids));
});
