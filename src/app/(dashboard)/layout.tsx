import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/session";
import { organizationService } from "@/services/OrganizationService";
import { toSessionUser } from "@/services/AccountService";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

/**
 * Server-side auth guard for the entire dashboard area.
 * The middleware only checks cookie presence - this is the real boundary.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  const organization = await organizationService.getPrimaryOrganization(ctx.user);
  const user = toSessionUser(ctx.user);

  return (
    <DashboardShell user={user} organizationName={organization.name}>
      {children}
    </DashboardShell>
  );
}
