import { ok, withApi } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import { keywordService } from "@/services/KeywordService";
import { researchSchema } from "@/validators/keyword";

export const dynamic = "force-dynamic";

/** POST /api/keywords/research - live keyword research (provider + cache + usage) */
export const POST = withApi(async ({ user, req }) => {
  const body = await req.json().catch(() => null);
  const parsed = researchSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError("Invalid research input", parsed.error.issues);

  const meta = { ip: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") };
  const result = await keywordService.research(user, parsed.data, meta);
  return ok(result);
});
