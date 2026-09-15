import { ok, withApi } from "@/lib/api";
import { organizationService } from "@/services/OrganizationService";
import { usageService } from "@/services/UsageService";

export const dynamic = "force-dynamic";

export const GET = withApi(async ({ user }) => {
  const org = await organizationService.getPrimaryOrganization(user);
  const usage = await usageService.getUsage(org.id);
  return ok(usage);
});
