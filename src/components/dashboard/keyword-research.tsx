"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiPost } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface MetricDatum {
  keyword: string;
  search_volume: number | null;
  difficulty: number | null;
  cpc: number | null;
  competition: string | null;
  intent: string | null;
  trend?: Array<{ month: string; volume: number }>;
  serp_features?: string[];
}

export interface ResearchResultData {
  seed: MetricDatum;
  related: MetricDatum[];
  suggestions: Array<{ keyword: string; search_volume: number | null }>;
  provider: string;
  demo: boolean;
}

export function ResearchResults({ result, projectId }: { result: ResearchResultData; projectId?: string }) {
  const seed = result.seed;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{seed.keyword}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Metric label="Volume" value={seed.search_volume !== null ? String(seed.search_volume) : "-"} />
            <Metric label="Difficulty" value={seed.difficulty !== null ? `${seed.difficulty}/100` : "-"} />
            <Metric label="CPC" value={seed.cpc !== null ? `$${seed.cpc}` : "-"} />
            <Metric label="Competition" value={seed.competition ?? "-"} />
            <Metric label="Intent" value={seed.intent ?? "-"} />
          </div>
          {seed.serp_features && seed.serp_features.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {seed.serp_features.slice(0, 8).map((f) => (
                <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <RelatedCard related={result.related} projectId={projectId} />

      {result.suggestions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Long-tail suggestions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {result.suggestions.map((s) => (
              <Badge key={s.keyword} variant="secondary">{s.keyword}</Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}


function RelatedCard({ related, projectId }: { related: MetricDatum[]; projectId?: string }) {
  if (related.length === 0) return null;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Related keywords ({related.length})</CardTitle>
        {projectId ? <TrackAllButton projectId={projectId} keywords={related.map((r) => r.keyword)} /> : null}
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-y">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Keyword</th>
              <th className="px-4 py-2 text-right font-medium">Volume</th>
              <th className="px-4 py-2 text-right font-medium">Difficulty</th>
              <th className="px-4 py-2 text-right font-medium">CPC</th>
              <th className="px-4 py-2 text-left font-medium">Intent</th>
            </tr>
          </thead>
          <tbody>
            {related.map((r) => (
              <tr key={r.keyword} className="border-b last:border-0">
                <td className="px-4 py-2 font-medium">{r.keyword}</td>
                <td className="px-4 py-2 text-right">{r.search_volume ?? "-"}</td>
                <td className="px-4 py-2 text-right">{r.difficulty ?? "-"}</td>
                <td className="px-4 py-2 text-right">{r.cpc !== null ? `$${r.cpc}` : "-"}</td>
                <td className="px-4 py-2">{r.intent ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function TrackAllButton({ projectId, keywords }: { projectId: string; keywords: string[] }) {
  const [done, setDone] = useState(false);
  const mutation = useMutation({
    mutationFn: () => apiPost(`/api/projects/${projectId}/keywords`, { keywords: keywords.slice(0, 100) }),
    onSuccess: (res) => {
      if (res.success) {
        setDone(true);
        const added = (res.data as { added: number }).added;
        toast.success(`Tracking ${added} new keyword(s)`);
      } else toast.error(res.error.message);
    },
    onError: (err: Error) => toast.error(err.message),
  });
  if (done) return <Badge variant="default">Added to tracking</Badge>;
  return (
    <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
      Track all
    </Button>
  );
}
