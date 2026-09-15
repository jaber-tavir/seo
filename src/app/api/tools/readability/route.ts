import { ok, withApi } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import { contentService } from "@/services/ContentService";
import { readabilitySchema } from "@/validators/content";

export const dynamic = "force-dynamic";

/**
 * POST /api/tools/readability - deterministic readability analysis
 * (Flesch Reading Ease + Flesch-Kincaid). Public and IP rate limited:
 * no AI call and no stored data are involved.
 */
export const POST = withApi(
  async ({ req }) => {
    const body = await req.json().catch(() => null);
    const parsed = readabilitySchema.safeParse(body ?? {});
    if (!parsed.success) throw new ValidationError("Invalid text", parsed.error.issues);

    return ok(contentService.analyzeText(parsed.data.text));
  },
  { auth: "none", rateLimit: { limit: 30, windowSeconds: 60 } },
);