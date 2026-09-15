import { withApi } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import { toolsService } from "@/services/ToolsService";
import { redirectCheckSchema } from "@/validators/tools";

/** POST /api/tools/redirect-check - trace a URL's redirect chain (SSRF-safe) */
export const POST = withApi(
  async ({ req }) => {
    const body = await req.json().catch(() => null);
    const parsed = redirectCheckSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError("Invalid URL", parsed.error.issues);

    return toolsService.traceRedirects(parsed.data);
  },
  { auth: "none", rateLimit: { limit: 10, windowSeconds: 60, scope: "ip" } }
);
