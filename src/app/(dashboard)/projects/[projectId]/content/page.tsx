import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/session";
import { projectService } from "@/services/ProjectService";
import { contentService } from "@/services/ContentService";
import { ContentBriefsManager } from "@/components/dashboard/content-briefs-manager";
import { ContentDocumentsList } from "@/components/dashboard/content-documents-list";
import { AiContentAssistant } from "@/components/dashboard/ai-content-assistant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Content & AI", robots: { index: false, follow: false } };
}

export default async function ProjectContentPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await requireUser();

  let project;
  try {
    project = await projectService.getAuthorizedProject(projectId, user);
  } catch {
    notFound();
  }

  const [briefsResult, docsResult] = await Promise.all([
    contentService.listProjectBriefs(user, project.id, { page: 1, limit: 20 }),
    contentService.listProjectDocuments(user, project.id, { page: 1, limit: 20 }),
  ]);

  const aiConfigured = contentService.isAiConfigured();

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
          <Link href={`/projects/${project.id}`}>
            <ArrowLeft className="size-4" /> Project overview
          </Link>
        </Button>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Content &amp; AI</h1>
          <Badge variant={aiConfigured ? "default" : "outline"} className="text-xs">
            {aiConfigured ? "AI provider connected" : "Demo AI provider"}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Research topics, build briefs and generate SEO content for {project.domain}.
        </p>
      </div>

      <Tabs defaultValue="briefs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="briefs">Content briefs</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="assistant">
            <Sparkles className="mr-1 size-3.5" /> AI assistant
          </TabsTrigger>
        </TabsList>

        <TabsContent value="briefs">
          <ContentBriefsManager projectId={project.id} initialData={briefsResult} />
        </TabsContent>

        <TabsContent value="documents">
          <ContentDocumentsList initialData={docsResult} />
        </TabsContent>

        <TabsContent value="assistant">
          <AiContentAssistant />
        </TabsContent>
      </Tabs>
    </div>
  );
}
