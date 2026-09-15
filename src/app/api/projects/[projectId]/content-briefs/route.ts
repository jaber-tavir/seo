import { ok, withApi } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import { contentService } from "@/services/ContentService";
import { contentListQuerySchema, createBriefSchema } from "@/validators/content";

export const dynamic = "force-dynamic";

type Params = { projectId: string };

/** GET /api/projects/[projectId]/content-briefs - paginated briefs (organization scoped) */
export const GET = withApi<Params>(async ({ req, params, user }) => {
  const query = Object.fromEntries(req.nextUrl.searchParams.entries());
  // Accept `limit` as an alias so UI links can use either name.
  const parsed = contentListQuerySchema.safeParse({
    ...query,
    pageSize: query.pageSize ?? query.limit,
  });
  if (!parsed.success) throw new ValidationError("Invalid query", parsed.error.issues);

  return ok(
    await contentService.listProjectBriefs(user, params.projectId, {
      page: parsed.data.page,
      limit: parsed.data.pageSize,
      keyword: parsed.data.search,
    }),
  );
});

/** POST /api/projects/[projectId]/content-briefs - create a content brief */
export const POST = withApi<Params>(async ({ req, params, user }) => {
  const body = await req.json().catch(() => null);
  const parsed = createBriefSchema.safeParse(body ?? {});
  if (!parsed.success) throw new ValidationError("Invalid content brief", parsed.error.issues);

  const meta = { ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") };
  return ok(await contentService.createContentBrief(user, params.projectId, parsed.data, meta));
});
