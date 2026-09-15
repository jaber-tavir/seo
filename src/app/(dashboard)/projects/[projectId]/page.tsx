import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { projectService } from "@/services/ProjectService";
import { auditLogService } from "@/services/AuditLogService";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/utils";
import { KeySquare, Link2, Users } from "lucide-react";

export const dynamic = "force-dynamic";

interface ProjectDetailPageProps {
  params: Promise<{ projectId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Project overview", robots: { index: false, follow: false } };
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { projectId } = await params;
  const user = await requireUser();

  // Other tenants' projects -> 404 (existence is never revealed)
  let dashboard;
  try {
    dashboard = await projectService.getProjectDashboard(user, projectId);
  } catch {
    notFound();
  }
  const { project, stats, latestAudit } = dashboard!;
  const activity = await auditLogService.listForOrganization(project.organization_id, 1, 10);
  const projectLogs = activity.rows.filter((log) => log.entity_id === project.id).slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2" asChild>
          <Link href="/projects">
            <ArrowLeft className="size-4" /> All projects
          </Link>
        </Button>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <Badge variant={project.status === "active" ? "success" : "secondary"} className="capitalize">
            {project.status}
          </Badge>
          <a
            href={project.website_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
          >
            {project.domain} <ExternalLink className="size-3.5" />
          </a>
        </div>
        <p className="text-muted-foreground text-sm">
          {project.search_engine} · {project.language.toUpperCase()} / {project.country.toUpperCase()} · created{" "}
          {formatDate(project.created_at)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs font-medium">SEO score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{latestAudit?.score ?? "—"}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {latestAudit ? `Last audit ${formatDate(latestAudit.created_at)}` : "Run your first audit to see a score"}
            </p>
          </CardContent>
        </Card>
        <StatCard title="Keywords" value={stats.keywords} icon={KeySquare} />
        <StatCard title="Backlinks" value={stats.backlinks} icon={Link2} />
        <StatCard title="Competitors" value={stats.competitors} icon={Users} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Site audit</CardTitle>
          <Button variant="outline" size="sm" asChild className="gap-1">
            <Link href={`/projects/${project.id}/audit`}>
              Run audit <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {latestAudit ? (
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                <p className="font-medium capitalize">{latestAudit.status}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Pages crawled</p>
                <p className="font-medium">
                  {latestAudit.pages_crawled} / {latestAudit.pages_total}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Errors</p>
                <p className="font-medium">{latestAudit.errors}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Warnings</p>
                <p className="font-medium">{latestAudit.warnings}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No audits yet. Run a crawl to analyze technical SEO, metadata, content, images and performance across your
              site.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Data collected</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground text-xs">Referring domains</p>
              <p className="text-xl font-semibold">{stats.referringDomains}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Reports</p>
              <p className="text-xl font-semibold">{stats.reports}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Audits</p>
              <p className="text-xl font-semibold">{stats.audits}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {projectLogs.length > 0 ? (
              projectLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-sm">
                  <span className="bg-secondary text-secondary-foreground mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium">
                    {log.action}
                  </span>
                  <p className="text-muted-foreground text-xs">{formatDateTime(log.created_at)}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground py-4 text-center text-sm">Activity for this project will appear here.</p>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
