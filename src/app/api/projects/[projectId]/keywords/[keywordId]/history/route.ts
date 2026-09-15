import { ok, withApi } from "@/lib/api";
import { NotFoundError } from "@/lib/errors";
import { keywordService } from "@/services/KeywordService";

export const dynamic = "force-dynamic";

type Params = { projectId: string; keywordId: string };

function validateParams(params: Params): Params {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!params?.projectId || !uuid.test(params.projectId)) throw new NotFoundError("Project not found");
  if (!params?.keywordId || !uuid.test(params.keywordId)) throw new NotFoundError("Keyword not found");
  return params;
}

/** GET /api/projects/[projectId]/keywords/[keywordId]/history - position history */
export const GET = withApi<Params>(async ({ params, user }) => {
  validateParams(params);
  return ok(await keywordService.keywordHistory(user, params.projectId, params.keywordId));
});
