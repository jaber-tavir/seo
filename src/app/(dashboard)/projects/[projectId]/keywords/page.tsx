import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/session";
import { projectService } from "@/services/ProjectService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KeywordsTable } from "@/components/dashboard/keywords-table";
import { RankOverview } from "@/components/dashboard/rank-overview";
import { KeywordClustering } from "@/components/dashboard/keyword-clustering";
import { ResearchHost } from "@/components/dashboard/keyword-research-host";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Keywords & rankings", robots: { index: false, follow: false } };
}

export default async function ProjectKeywordsPage({ params }: { params: Promise<{ projectId: string }> }) {
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
          <h1 className="text-2xl font-bold tracking-tight">Keywords & rankings</h1>
          <span className="text-muted-foreground text-sm">{project.domain}</span>
        </div>
        <p className="text-muted-foreground text-sm">
          Research real keyword metrics, track keywords per project, cluster topics and monitor ranking history.
        </p>
      </div>

      <Tabs defaultValue="tracked">
        <TabsList>
          <TabsTrigger value="tracked">Tracked</TabsTrigger>
          <TabsTrigger value="rankings">Rank tracker</TabsTrigger>
          <TabsTrigger value="research">Research</TabsTrigger>
          <TabsTrigger value="clusters">Clustering</TabsTrigger>
        </TabsList>

        <TabsContent value="tracked" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tracked keywords</CardTitle>
            </CardHeader>
            <CardContent>
              <KeywordsTable projectId={project.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rankings" className="mt-4">
          <RankOverview projectId={project.id} />
        </TabsContent>

        <TabsContent value="research" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Keyword research</CardTitle>
            </CardHeader>
            <CardContent>
              <ResearchHost projectId={project.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clusters" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Keyword clustering</CardTitle>
            </CardHeader>
            <CardContent>
              <KeywordClustering />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

