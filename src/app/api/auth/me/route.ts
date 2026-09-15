import { ok, withApi } from "@/lib/api";
import { toSessionUser } from "@/services/AccountService";
import { organizationService } from "@/services/OrganizationService";

export const dynamic = "force-dynamic";

export const GET = withApi(async ({ user }) => {
  const organization = await organizationService.getPrimaryOrganization(user);
  return ok({
    user: toSessionUser(user),
    organization: { id: organization.id, name: organization.name, plan_id: organization.plan_id },
  });
});
