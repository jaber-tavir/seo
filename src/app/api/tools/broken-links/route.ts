import { withApi } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import { toolsService } from "@/services/ToolsService";
import { brokenLinksSchema } from "@/validators/tools";

/** POST /api/tools/broken-links - verify outgoing links of a page (SSRF-safe) */
export const POST = withApi(
  async ({ req }) => {
    const body = await req.json().catch(() => null);
    const parsed = brokenLinksSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.issues);

    return toolsService.checkBrokenLinks(parsed.data);
  },
  { auth: "none", rateLimit: { limit: 5, windowSeconds: 60, scope: "ip" } }
);
