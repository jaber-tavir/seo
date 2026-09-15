import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/session";
import { projectService } from "@/services/ProjectService";
import { keywordService } from "@/services/KeywordService";
import { Button } from "@/components/ui/button";
import { KeywordDetail } from "@/components/dashboard/keyword-detail";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Keyword detail", robots: { index: false, follow: false } };
}

export default async function KeywordDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; keywordId: string }>;
}) {
  const { projectId, keywordId } = await params;
  const user = await requireUser();
  let project;
  try {
    project = await projectService.getAuthorizedProject(projectId, user);
    // ownership check on the keyword itself (404 for foreign tenants)
    await keywordService.keywordHistory(user, project.id, keywordId);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2" asChild>
          <Link href={`/projects/${project.id}/keywords`}>
            <ArrowLeft className="size-4" /> Keywords
          </Link>
        </Button>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Keyword detail</h1>
        <p className="text-muted-foreground text-sm">{project.domain}</p>
      </div>
      <KeywordDetail projectId={project.id} keywordId={keywordId} />
    </div>
  );
}
