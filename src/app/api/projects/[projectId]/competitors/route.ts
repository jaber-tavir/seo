import { ok, created, withApi } from "@/lib/api";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { competitorService } from "@/services/CompetitorService";
import { addCompetitorSchema, competitorListQuerySchema } from "@/validators/competitor";

export const dynamic = "force-dynamic";

type Params = { projectId: string };

function validateParams(params: Params): Params {
  if (!params?.projectId) throw new NotFoundError("Project not found");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.projectId)) {
    throw new NotFoundError("Project not found");
  }
  return params;
}

/** GET /api/projects/[projectId]/competitors - paginated tracked competitors */
export const GET = withApi<Params>(async ({ params, user, req }) => {
  validateParams(params);
  const query = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = competitorListQuerySchema.safeParse(query);
  if (!parsed.success) throw new ValidationError("Invalid query", parsed.error.issues);

  const result = await competitorService.listCompetitors(user, params.projectId, parsed.data);
  return ok({
    competitors: result.rows.map((r) => r.toJSON()),
    pagination: result.pagination,
  });
});

/** POST /api/projects/[projectId]/competitors - add a competitor domain */
export const POST = withApi<Params>(async ({ params, user, req }) => {
  validateParams(params);
  const body = await req.json().catch(() => null);
  const parsed = addCompetitorSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError("Invalid competitor", parsed.error.issues);
  const meta = { ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") };

  return created((await competitorService.addCompetitor(user, params.projectId, parsed.data, meta)).toJSON());
});
