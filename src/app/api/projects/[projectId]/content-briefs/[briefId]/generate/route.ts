import { ok, withApi } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import { contentService } from "@/services/ContentService";
import { generateContentSchema } from "@/validators/content";

export const dynamic = "force-dynamic";

type Params = { projectId: string; briefId: string };

/** POST /api/projects/[projectId]/content-briefs/[briefId]/generate - AI article from a brief */
export const POST = withApi<Params>(
  async ({ req, params, user }) => {
    const body = await req.json().catch(() => ({}));
    const parsed = generateContentSchema.safeParse(body ?? {});
    if (!parsed.success) throw new ValidationError("Invalid generation options", parsed.error.issues);

    const meta = { ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") };
    return ok(await contentService.generateContentWithAi(user, params.briefId, parsed.data, meta));
  },
  { rateLimit: { limit: 5, windowSeconds: 60, scope: "user" } },
);
