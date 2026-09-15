import { ok, withApi } from "@/lib/api";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { competitorService } from "@/services/CompetitorService";
import { contentGapQuerySchema } from "@/validators/competitor";

export const dynamic = "force-dynamic";

type Params = { projectId: string };

/** GET /api/projects/[projectId]/content-gap - keywords competitors rank for that we don't track */
export const GET = withApi<Params>(async ({ params, user, req }) => {
  if (!params?.projectId) throw new NotFoundError("Project not found");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.projectId)) {
    throw new NotFoundError("Project not found");
  }
  const query = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = contentGapQuerySchema.safeParse(query);
  if (!parsed.success) throw new ValidationError("Invalid filters", parsed.error.issues);

  return ok(
    await competitorService.contentGap(user, params.projectId, {
      minVolume: parsed.data.minVolume,
      maxDifficulty: parsed.data.maxDifficulty,
      intent: parsed.data.intent,
      minCompetitors: parsed.data.minCompetitors,
    })
  );
});
