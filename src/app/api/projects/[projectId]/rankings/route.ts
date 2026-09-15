import { ok, withApi } from "@/lib/api";
import { NotFoundError } from "@/lib/errors";
import { keywordService } from "@/services/KeywordService";

export const dynamic = "force-dynamic";

type Params = { projectId: string };

function validateParams(params: Params): Params {
  if (!params?.projectId) throw new NotFoundError("Project not found");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.projectId)) {
    throw new NotFoundError("Project not found");
  }
  return params;
}

/** GET /api/projects/[projectId]/rankings - rank tracker overview */
export const GET = withApi<Params>(async ({ params, user }) => {
  validateParams(params);
  return ok(await keywordService.rankOverview(user, params.projectId));
});
