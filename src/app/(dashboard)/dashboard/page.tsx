import Link from "next/link";
import { Activity, FolderKanban, Gauge, KeySquare, Link2, Radar } from "lucide-react";
import { requireUser } from "@/lib/session";
import { organizationService } from "@/services/OrganizationService";
import { projectService } from "@/services/ProjectService";
import { usageService } from "@/services/UsageService";
import { auditLogService } from "@/services/AuditLogService";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ProjectFormDialog } from "@/components/forms/project-form";
import { UsageAreaChart, type UsageSeriesPoint } from "@/components/charts/usage-area-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const org = await organizationService.getPrimaryOrganization(user);

  const [usage, projects, activity, series] = await Promise.all([
    usageService.getUsage(org.id),
    projectService.listProjects(user, { pageSize: 5 }),
    auditLogService.listForOrganization(org.id, 1, 6),
    usageService.getUsageSeries(org.id, 6),
  ]);

  const metricMap = new Map(usage.metrics.map((m) => [m.metric, m] as const));
  const projectsUsage = metricMap.get("projects");
  const keywordsUsage = metricMap.get("tracked_keywords");
  const auditsUsage = metricMap.get("audits");
  const crawledUsage = metricMap.get("crawled_pages");

  const chartData: UsageSeriesPoint[] = Array.from(
    series.reduce<Map<string, number>>((acc, row) => {
      const key = new Date(row.period_start).toISOString().slice(0, 7);
      acc.set(key, (acc.get(key) ?? 0) + Number(row.total));
      return acc;
    }, new Map())
  ).map(([period, amount]) => ({ period, amount }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user.first_name ?? "there"} 👋</h1>
          <p className="text-muted-foreground text-sm">
            Plan: <span className="text-foreground font-medium">{usage.plan?.name ?? "Free"}</span> · Usage resets on the
            1st of each month
          </p>
        </div>
        <ProjectFormDialog />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Projects"
          value={projectsUsage?.used ?? 0}
          hint={projectsUsage ? `of ${projectsUsage.limit === -1 ? "unlimited" : projectsUsage.limit}` : undefined}
          icon={FolderKanban}
          href="/projects"
        />
        <StatCard
          title="Tracked keywords"
          value={keywordsUsage?.used ?? 0}
          hint={keywordsUsage ? `of ${keywordsUsage.limit === -1 ? "unlimited" : keywordsUsage.limit}` : undefined}
          icon={KeySquare}
        />
        <StatCard
          title="Audits this month"
          value={auditsUsage?.used ?? 0}
          hint={auditsUsage ? `of ${auditsUsage.limit === -1 ? "unlimited" : auditsUsage.limit}` : undefined}
          icon={Radar}
        />
        <StatCard
          title="Crawled pages this month"
          value={crawledUsage?.used ?? 0}
          hint={crawledUsage ? `of ${crawledUsage.limit === -1 ? "unlimited" : crawledUsage.limit}` : undefined}
          icon={Gauge}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Usage trend</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <UsageAreaChart data={chartData} label="Actions" />
            ) : (
              <EmptyState
                icon={Activity}
                title="No usage data yet"
                description="Run audits and track keywords to see your usage trend here."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.rows.length > 0 ? (
              activity.rows.map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-sm">
                  <span className="bg-secondary text-secondary-foreground mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium">
                    {log.action}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate">{log.entity_type ?? "—"}</p>
                    <p className="text-muted-foreground text-xs">{formatDateTime(log.created_at)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground py-6 text-center text-sm">Activity will appear here as you work.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Your projects</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/projects">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {projects.rows.length > 0 ? (
            <div className="space-y-2">
              {projects.rows.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="hover:bg-accent/60 flex items-center gap-3 rounded-md border px-4 py-3"
                >
                  <Link2 className="text-muted-foreground size-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{project.name}</p>
                    <p className="text-muted-foreground truncate text-xs">{project.domain}</p>
                  </div>
                  <Badge variant={project.status === "active" ? "success" : "secondary"} className="capitalize">
                    {project.status}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Add your first website to start tracking its SEO health."
              action={<ProjectFormDialog label="Add your first project" />}
            />
          )}
        </CardContent>
      </Card>

    </div>
  );
}
