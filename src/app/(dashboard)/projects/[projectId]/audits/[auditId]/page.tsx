import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/session";
import { projectService } from "@/services/ProjectService";
import { auditService } from "@/services/AuditService";
import { auditRepository } from "@/repositories/AuditRepository";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuditProgress } from "@/components/dashboard/audit-progress";
import { IssuesTable } from "@/components/dashboard/issues-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Audit report",
  robots: { index: false, follow: false },
};

export default async function AuditDetailPage({ params }: { params: Promise<{ projectId: string; auditId: string }> }) {
  const { projectId, auditId } = await params;
  const user = await requireUser();

  let project, audit;
  try {
    project = await projectService.getAuthorizedProject(projectId, user);
    audit = await auditService.getAuditForUser(user, project.id, auditId);
  } catch {
    notFound();
  }

  const models = await import("@/models");
  const crawl = await models.Crawl.findOne({ where: { audit_id: audit.id }, order: [["created_at", "DESC"]] });
  const counts = await auditRepository.countBySeverity(audit.id);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2" asChild>
          <Link href={`/projects/${project.id}/audit`}>
            <ArrowLeft className="size-4" /> Site audit
          </Link>
        </Button>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Audit report</h1>
        <p className="text-muted-foreground text-sm">
          {project.domain} · started {formatDateTime(audit.started_at ?? audit.created_at)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Crawl progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AuditProgress
            projectId={project.id}
            auditId={audit.id}
            initial={{
              status: audit.status,
              pages_crawled: audit.pages_crawled,
              pages_total: audit.pages_total,
              score: audit.score,
              errors: audit.errors,
              warnings: audit.warnings,
            }}
          />
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground text-xs">SEO score</p>
              <p className="text-2xl font-bold">{audit.score ?? "—"}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground text-xs">Health</p>
              <p className="text-2xl font-bold">{audit.health_score ?? "—"}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground text-xs">Errors</p>
              <p className="text-2xl font-bold text-destructive">{audit.errors}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground text-xs">Warnings</p>
              <p className="text-2xl font-bold">{audit.warnings}</p>
            </div>
          </div>
          {crawl && (
            <p className="text-muted-foreground text-xs">
              Crawl {crawl.status} · {crawl.processed_urls} processed / {crawl.failed_urls} failed · response time stored
              per page · {counts.notices} notices
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Issues found ({audit.errors + audit.warnings + audit.notices})</CardTitle>
        </CardHeader>
        <CardContent>
          <IssuesTable projectId={project.id} auditId={audit.id} />
        </CardContent>
      </Card>
    </div>
  );
}