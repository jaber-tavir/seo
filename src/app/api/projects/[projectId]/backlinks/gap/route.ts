import { ok, withApi } from "@/lib/api";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { backlinkService } from "@/services/BacklinkService";
import { backlinkGapSchema } from "@/validators/backlink-gap";

export const dynamic = "force-dynamic";

type Params = { projectId: string };

/** POST /api/projects/[projectId]/backlinks/gap - referring domains linking to competitors but not us */
export const POST = withApi<Params>(async ({ params, user, req }) => {
  if (!params?.projectId) throw new NotFoundError("Project not found");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.projectId)) {
    throw new NotFoundError("Project not found");
  }
  const body = await req.json().catch(() => null);
  const parsed = backlinkGapSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError("Invalid gap request", parsed.error.issues);

  return ok(await backlinkService.gap(user, params.projectId, parsed.data.competitor_domains));
});
