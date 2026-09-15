import { ok, withApi } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import { contentService } from "@/services/ContentService";
import { contentListQuerySchema, createContentWithProjectSchema } from "@/validators/content";

export const dynamic = "force-dynamic";

/** GET /api/content - paginated content documents for the caller's organization */
export const GET = withApi(async ({ req, user }) => {
  const query = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = contentListQuerySchema.safeParse({
    ...query,
    pageSize: query.pageSize ?? query.limit,
  });
  if (!parsed.success) throw new ValidationError("Invalid query", parsed.error.issues);

  return ok(
    await contentService.listContentDocuments(user, {
      page: parsed.data.page,
      limit: parsed.data.pageSize,
      search: parsed.data.search,
      status: parsed.data.status,
    }),
  );
});

/**
 * POST /api/content - create a content document inside one of the caller's
 * projects. Ownership of `project_id` is verified from the session.
 */
export const POST = withApi(async ({ req, user }) => {
  const body = await req.json().catch(() => null);
  const parsed = createContentWithProjectSchema.safeParse(body ?? {});
  if (!parsed.success) throw new ValidationError("Invalid content document", parsed.error.issues);

  const { project_id: projectId, ...input } = parsed.data;
  const meta = { ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") };

  return ok(await contentService.createContentDocument(user, projectId, input, meta));
});