import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/session";
import { projectService } from "@/services/ProjectService";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompetitorsManager } from "@/components/dashboard/competitors-manager";
import { ContentGapView } from "@/components/dashboard/content-gap-view";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Competitors", robots: { index: false, follow: false } };
}

export default async function ProjectCompetitorsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await requireUser();
  let project;
  try {
    project = await projectService.getAuthorizedProject(projectId, user);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2" asChild>
          <Link href={`/projects/${project.id}`}>
            <ArrowLeft className="size-4" /> Project overview
          </Link>
        </Button>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Competitors</h1>
          <span className="text-muted-foreground text-sm">{project.domain}</span>
        </div>
        <p className="text-muted-foreground text-sm">
          Track competitor domains, compare keyword overlap and find content gaps.
        </p>
      </div>

      <Tabs defaultValue="tracked">
        <TabsList>
          <TabsTrigger value="tracked">Competitors</TabsTrigger>
          <TabsTrigger value="gap">Content gap</TabsTrigger>
        </TabsList>

        <TabsContent value="tracked" className="mt-4">
          <CompetitorsManager projectId={project.id} />
        </TabsContent>

        <TabsContent value="gap" className="mt-4">
          <ContentGapView projectId={project.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
