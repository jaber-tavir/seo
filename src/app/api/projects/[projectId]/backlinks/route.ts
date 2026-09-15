import { ok, withApi } from "@/lib/api";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { backlinkService } from "@/services/BacklinkService";
import { backlinkListQuerySchema, backlinkRefreshSchema } from "@/validators/backlink";

export const dynamic = "force-dynamic";

type Params = { projectId: string };

function validateParams(params: Params): Params {
  if (!params?.projectId) throw new NotFoundError("Project not found");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.projectId)) {
    throw new NotFoundError("Project not found");
  }
  return params;
}

/** GET /api/projects/[projectId]/backlinks - overview + paginated rows (view=all|new|lost|referring-domains|anchors) */
export const GET = withApi<Params>(async ({ params, user, req }) => {
  validateParams(params);
  const query = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = backlinkListQuerySchema.safeParse(query);
  if (!parsed.success) throw new ValidationError("Invalid query", parsed.error.issues);

  const [overview, list] = await Promise.all([
    backlinkService.overview(user, params.projectId),
    backlinkService.listBacklinks(user, params.projectId, parsed.data),
  ]);
  return ok({ overview, ...list });
});

/** POST /api/projects/[projectId]/backlinks - sync snapshot from provider */
export const POST = withApi<Params>(async ({ params, user, req }) => {
  validateParams(params);
  const body = await req.json().catch(() => null);
  const parsed = backlinkRefreshSchema.safeParse(body ?? {});
  if (!parsed.success) throw new ValidationError("Invalid refresh", parsed.error.issues);
  const meta = { ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") };

  return ok(await backlinkService.refresh(user, params.projectId, parsed.data.limit, meta));
});
