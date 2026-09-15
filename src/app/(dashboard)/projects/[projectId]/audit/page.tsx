import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/session";
import { projectService } from "@/services/ProjectService";
import { auditRepository } from "@/repositories/AuditRepository";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StartAuditButton } from "@/components/dashboard/start-audit-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Site audit",
  robots: { index: false, follow: false },
};

const statusVariant: Record<string, "success" | "warning" | "secondary" | "destructive"> = {
  completed: "success",
  running: "warning",
  pending: "secondary",
  failed: "destructive",
  cancelled: "secondary",
};

export default async function SiteAuditPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await requireUser();
  let project;
  try {
    project = await projectService.getAuthorizedProject(projectId, user);
  } catch {
    notFound();
  }
  const audits = await auditRepository.listAuditsForProject(project.id, { page: 1, pageSize: 20 });

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2" asChild>
          <Link href={`/projects/${project.id}`}>
            <ArrowLeft className="size-4" /> Project overview
          </Link>
        </Button>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Site audit</h1>
          <span className="text-muted-foreground text-sm">{project.domain}</span>
        </div>
        <p className="text-muted-foreground text-sm">
          The crawler fetches pages through an SSRF-safe client, respects robots.txt, follows same-site links up to the
          configured depth, and analyzes on-page + technical SEO signals.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Start a new crawl</CardTitle>
        </CardHeader>
        <CardContent>
          <StartAuditButton projectId={project.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Previous audits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {audits.rows.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No audits yet — start your first crawl above.
            </p>
          ) : (
            audits.rows.map((audit) => (
              <div key={audit.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">SEO score: {audit.score ?? "—"}</p>
                    <Badge variant={statusVariant[audit.status] ?? "secondary"} className="capitalize">
                      {audit.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {audit.pages_crawled} pages crawled · {audit.errors} errors · {audit.warnings} warnings · ran{" "}
                    {formatDate(audit.created_at)}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild className="shrink-0 gap-1">
                  <Link href={`/projects/${project.id}/audits/${audit.id}`}>
                    View <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}