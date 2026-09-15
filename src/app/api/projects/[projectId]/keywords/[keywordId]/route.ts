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

/** DELETE /api/projects/[projectId]/keywords/[keywordId] - untrack + delete history */
export const DELETE = withApi<Params>(async ({ params, user, req }) => {
  validateParams(params);
  const meta = { ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") };
  return ok(await keywordService.removeKeyword(user, params.projectId, params.keywordId, meta));
});
