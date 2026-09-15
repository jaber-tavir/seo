import { ok, withApi } from "@/lib/api";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { keywordService } from "@/services/KeywordService";
import { rankCheckSchema } from "@/validators/keyword";

export const dynamic = "force-dynamic";

type Params = { projectId: string; keywordId: string };

function validateParams(params: Params): Params {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!params?.projectId || !uuid.test(params.projectId)) throw new NotFoundError("Project not found");
  if (!params?.keywordId || !uuid.test(params.keywordId)) throw new NotFoundError("Keyword not found");
  return params;
}

/** POST /api/projects/[projectId]/keywords/[keywordId]/check - run a rank check */
export const POST = withApi<Params>(async ({ params, user, req }) => {
  validateParams(params);
  const body = await req.json().catch(() => ({}));
  const parsed = rankCheckSchema.safeParse(body ?? {});
  if (!parsed.success) throw new ValidationError("Invalid rank check input", parsed.error.issues);

  const meta = { ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") };
  return ok(await keywordService.checkRank(user, params.projectId, params.keywordId, parsed.data, meta));
});
