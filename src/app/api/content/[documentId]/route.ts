import { ok, withApi } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import { contentService } from "@/services/ContentService";
import { updateContentSchema } from "@/validators/content";

export const dynamic = "force-dynamic";

type Params = { documentId: string };

/** GET /api/content/[documentId] */
export const GET = withApi<Params>(async ({ params, user }) =>
  ok(await contentService.getContentDocument(user, params.documentId)),
);

/** PATCH /api/content/[documentId] */
export const PATCH = withApi<Params>(async ({ req, params, user }) => {
  const body = await req.json().catch(() => null);
  const parsed = updateContentSchema.safeParse(body ?? {});
  if (!parsed.success) throw new ValidationError("Invalid update", parsed.error.issues);

  const meta = { ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") };
  return ok(await contentService.updateContentDocument(user, params.documentId, parsed.data, meta));
});

/** DELETE /api/content/[documentId] */
export const DELETE = withApi<Params>(async ({ req, params, user }) => {
  const meta = { ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") };
  return ok(await contentService.deleteContentDocument(user, params.documentId, meta));
});