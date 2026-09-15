import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/session";
import { organizationService } from "@/services/OrganizationService";
import { usageService } from "@/services/UsageService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UsageMeter } from "@/components/dashboard/usage-meter";

export const metadata: Metadata = {
  title: "Billing & usage",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const user = await requireUser();
  const org = await organizationService.getPrimaryOrganization(user);
  const usage = await usageService.getUsage(org.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing &amp; usage</h1>
        <p className="text-muted-foreground text-sm">
          Current period: {usage.period.period_start.toDateString()} – {usage.period.period_end.toDateString()}
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Current plan</CardTitle>
            <CardDescription>
              {usage.plan?.name ?? "Free"} — limits are enforced on every action via the central UsageService.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link href="/pricing">
              Compare plans <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          {usage.metrics.map((metric) => (
            <UsageMeter
              key={metric.metric}
              label={metric.metric.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              used={metric.used}
              limit={metric.limit}
              percent={metric.percent}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upgrading</CardTitle>
          <CardDescription>
            Stripe checkout, subscription lifecycle and invoices are part of the billing phase (Phase 9). Until then, plan
            limits already work and upgrading is done by support.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
