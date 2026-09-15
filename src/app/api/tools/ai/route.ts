import { ok, withApi } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import { contentService } from "@/services/ContentService";
import { aiToolRequestSchema } from "@/validators/content";

export const dynamic = "force-dynamic";

/**
 * POST /api/tools/ai - run any AI content tool (title, description, outline,
 * faq, rewrite, expand, shorten, brief, content).
 *
 * Public: IP rate limited. Signed-in callers additionally consume one AI
 * generation from their plan (enforced inside ContentService).
 */
export const POST = withApi(
  async ({ req, user }) => {
    const body = await req.json().catch(() => null);
    const parsed = aiToolRequestSchema.safeParse(body ?? {});
    if (!parsed.success) throw new ValidationError("Invalid AI tool request", parsed.error.issues);

    const meta = { ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") };
    return ok(await contentService.runAiTool(parsed.data, user, meta));
  },
  { auth: "optional", rateLimit: { limit: 10, windowSeconds: 60 } },
);
