"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StartAuditButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [maxPages, setMaxPages] = useState("100");
  const [maxDepth, setMaxDepth] = useState("3");
  const [running, setRunning] = useState(false);

  const start = async () => {
    setRunning(true);
    try {
      const result = await apiFetch<{ audit: { id: string } }>(
        `/api/projects/${projectId}/audits`,
        {
          method: "POST",
          body: JSON.stringify({ maxPages: Number(maxPages) || 100, maxDepth: Number(maxDepth) || 3 }),
        }
      );
      toast.success("Audit started — crawling in the background");
      router.push(`/projects/${projectId}/audits/${result.audit.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start audit");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="maxPages">Max pages</Label>
        <Input id="maxPages" type="number" min={1} max={5000} value={maxPages} onChange={(e) => setMaxPages(e.target.value)} className="w-28" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="maxDepth">Max depth</Label>
        <Input id="maxDepth" type="number" min={0} max={5} value={maxDepth} onChange={(e) => setMaxDepth(e.target.value)} className="w-28" />
      </div>
      <Button onClick={start} disabled={running} className="gap-2">
        {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
        {running ? "Starting…" : "Run new audit"}
      </Button>
    </div>
  );
}