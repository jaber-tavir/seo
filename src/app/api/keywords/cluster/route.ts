import { ok, withApi } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import { keywordService } from "@/services/KeywordService";
import { clusterSchema } from "@/validators/keyword";

export const dynamic = "force-dynamic";

/** POST /api/keywords/cluster - group keywords by shared stem words */
export const POST = withApi(async ({ user, req }) => {
  const body = await req.json().catch(() => null);
  const parsed = clusterSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError("Invalid clustering input", parsed.error.issues);

  const meta = { ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") };
  const result = await keywordService.cluster(user, parsed.data, meta);
  return ok(result);
});
