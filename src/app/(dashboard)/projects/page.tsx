import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight, FolderKanban, Globe, Radar } from "lucide-react";
import { requireUser } from "@/lib/session";
import { projectService } from "@/services/ProjectService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ProjectFormDialog } from "@/components/forms/project-form";
import { ProjectRowActions } from "@/components/dashboard/project-row-actions";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Projects",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface ProjectsPageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;
  const user = await requireUser();
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const search = params.search?.trim() || undefined;

  const result = await projectService.listProjects(user, { page, pageSize: 10, search });
  const searchQS = search ? `&search=${encodeURIComponent(search)}` : "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm">
            {result.total} {result.total === 1 ? "project" : "projects"} in your organization
          </p>
        </div>
        <ProjectFormDialog />
      </div>

      <form className="flex max-w-sm gap-2" action="/projects">
        <input
          name="search"
          defaultValue={search ?? ""}
          placeholder="Search by name or domain…"
          className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
        />
        <Button type="submit" variant="outline" size="sm">
          Search
        </Button>
      </form>

      {result.rows.length > 0 ? (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Last audit</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <Link href={`/projects/${project.id}`} className="font-medium underline-offset-4 hover:underline">
                        {project.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                        <Globe className="size-3.5" /> {project.domain}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={project.status === "active" ? "success" : "secondary"} className="capitalize">
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="uppercase">{project.country}</TableCell>
                    <TableCell>{project.last_audit_at ? formatDate(project.last_audit_at) : "—"}</TableCell>
                    <TableCell>{formatDate(project.created_at)}</TableCell>
                    <TableCell>
                      <ProjectRowActions projectId={project.id} projectName={project.name} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {result.totalPages > 1 ? (
            <div className="flex items-center justify-end gap-2">
              {result.page > 1 ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/projects?page=${result.page - 1}${searchQS}`}>
                    <ChevronLeft className="size-4" /> Previous
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  <ChevronLeft className="size-4" /> Previous
                </Button>
              )}
              <span className="text-muted-foreground text-sm">
                Page {result.page} of {result.totalPages}
              </span>
              {result.page < result.totalPages ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/projects?page=${result.page + 1}${searchQS}`}>
                    Next <ChevronRight className="size-4" />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Next <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon={FolderKanban}
          title={search ? "No projects match your search" : "No projects yet"}
          description={
            search
              ? "Try a different search term, or create a new project."
              : "Projects group everything: audits, keywords, backlinks and reports for one website."
          }
          action={<ProjectFormDialog label={search ? "New project" : "Add your first project"} />}
        />
      )}

      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Radar className="size-3.5" />
        Site audits and crawling arrive in Phase 2 — projects are ready for them now.
      </p>

    </div>
  );
}
