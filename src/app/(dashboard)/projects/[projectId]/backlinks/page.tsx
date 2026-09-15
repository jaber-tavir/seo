import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/session";
import { projectService } from "@/services/ProjectService";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BacklinksManager } from "@/components/dashboard/backlinks-manager";
import { BacklinkGapView } from "@/components/dashboard/backlink-gap-view";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Backlinks", robots: { index: false, follow: false } };
}

export default async function ProjectBacklinksPage({ params }: { params: Promise<{ projectId: string }> }) {
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
          <h1 className="text-2xl font-bold tracking-tight">Backlinks</h1>
          <span className="text-muted-foreground text-sm">{project.domain}</span>
        </div>
        <p className="text-muted-foreground text-sm">
          Total backlinks, referring domains, new and lost links, anchors and link opportunities.
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="gap">Backlink gap</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <BacklinksManager projectId={project.id} />
        </TabsContent>

        <TabsContent value="gap" className="mt-4">
          <BacklinkGapView projectId={project.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
