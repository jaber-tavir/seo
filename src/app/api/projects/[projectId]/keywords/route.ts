import { ok, withApi } from "@/lib/api";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { keywordService } from "@/services/KeywordService";
import { keywordListQuerySchema, trackKeywordSchema, trackKeywordsBulkSchema } from "@/validators/keyword";

export const dynamic = "force-dynamic";

type Params = { projectId: string };

function validateParams(params: Params): Params {
  if (!params?.projectId) throw new NotFoundError("Project not found");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.projectId)) {
    throw new NotFoundError("Project not found");
  }
  return params;
}

/** GET /api/projects/[projectId]/keywords - paginated tracked keywords with latest positions */
export const GET = withApi<Params>(async ({ params, user, req }) => {
  validateParams(params);
  const query = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = keywordListQuerySchema.safeParse(query);
  if (!parsed.success) throw new ValidationError("Invalid query", parsed.error.issues);

  const result = await keywordService.listKeywords(user, params.projectId, parsed.data);
  return ok({
    keywords: result.rows.map((r) => ({ ...r })),
    pagination: result.pagination,
  });
});

/** POST /api/projects/[projectId]/keywords - track one or many keywords */
export const POST = withApi<Params>(async ({ params, user, req }) => {
  validateParams(params);
  const body = await req.json().catch(() => null);
  const meta = { ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") };

  // Bulk shape: { keywords: [...] }
  if (body && Array.isArray((body as { keywords?: unknown }).keywords)) {
    const parsed = trackKeywordsBulkSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError("Invalid keywords", parsed.error.issues);
    return ok(await keywordService.trackKeywordsBulk(user, params.projectId, parsed.data, meta));
  }

  const parsed = trackKeywordSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError("Invalid keyword", parsed.error.issues);
  return ok(await keywordService.trackKeyword(user, params.projectId, parsed.data, meta));
});
