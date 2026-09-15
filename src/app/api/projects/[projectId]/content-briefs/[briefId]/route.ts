import { ok, withApi } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import { contentService } from "@/services/ContentService";
import { contentBriefUpdateSchema } from "@/validators/content";

export const dynamic = "force-dynamic";

type Params = { projectId: string; briefId: string };

/** GET /api/projects/[projectId]/content-briefs/[briefId] */
export const GET = withApi<Params>(async ({ params, user }) =>
  ok(await contentService.getContentBrief(user, params.briefId)),
);

/** PATCH /api/projects/[projectId]/content-briefs/[briefId] */
export const PATCH = withApi<Params>(async ({ req, params, user }) => {
  const body = await req.json().catch(() => null);
  const parsed = contentBriefUpdateSchema.safeParse(body ?? {});
  if (!parsed.success) throw new ValidationError("Invalid update", parsed.error.issues);

  const meta = { ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") };
  return ok(await contentService.updateContentBrief(user, params.briefId, parsed.data, meta));
});

/** DELETE /api/projects/[projectId]/content-briefs/[briefId] */
export const DELETE = withApi<Params>(async ({ req, params, user }) => {
  const meta = { ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") };
  return ok(await contentService.deleteContentBrief(user, params.briefId, params.projectId, meta));
});
