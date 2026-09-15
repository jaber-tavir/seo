"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { Badge } from "@/components/ui/badge";

interface AuditState {
  audit: { status: string; pages_crawled: number; pages_total: number; score: number | null; errors: number; warnings: number };
}

/** Polls the audit endpoint while the crawl is in flight and shows live progress. */
export function AuditProgress({ projectId, auditId, initial }: { projectId: string; auditId: string; initial: AuditState["audit"] }) {
  const [state, setState] = useState(initial);
  const running = state.status === "pending" || state.status === "running";

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(async () => {
      try {
        const data = await apiFetch<AuditState>(`/api/projects/${projectId}/audits/${auditId}`);
        setState(data.audit);
      } catch {
        // keep polling; the route will stop itself once completed
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [running, projectId, auditId]);

  const total = Math.max(1, state.pages_total);
  const percent = Math.min(100, Math.round((state.pages_crawled / total) * 100));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {running && <Loader2 className="size-4 animate-spin" />}
        <p className="text-sm font-medium capitalize">
          {running ? "Crawling…" : state.status}
          <span className="text-muted-foreground ml-2 font-normal">
            {state.pages_crawled} / {state.pages_total} pages · {percent}%
          </span>
        </p>
        <Badge variant={running ? "warning" : state.status === "completed" ? "success" : "secondary"} className="capitalize">
          {state.status}
        </Badge>
      </div>
      <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
        <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}