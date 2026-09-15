"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Analysis {
  competitor: { id: string; domain: string; name: string | null; created_at: string };
  organicKeywords: Array<{
    keyword: string;
    search_volume: number | null;
    difficulty: number | null;
    intent: string | null;
    position: number | null;
    url: string | null;
  }>;
  estimatedTraffic: { total: number; trackedOverlap: number; relatedCount: number };
  topPages: Array<{ url: string; keywords: number; traffic: number }>;
  keywordOverlap: { common: string[]; missing: string[]; unique: string[] };
  provider: string;
  demo: boolean;
}

export function CompetitorAnalysisView({ projectId, competitorId }: { projectId: string; competitorId: string }) {
  const { data, isLoading, isError } = useQuery<Analysis>({
    queryKey: ["competitor-analysis", projectId, competitorId],
    queryFn: () => apiFetch<Analysis>(`/api/projects/${projectId}/competitors/${competitorId}`),
  });

  if (isLoading) return <p className="text-muted-foreground py-4 text-center text-sm">Analyzing competitor...</p>;
  if (isError || !data) return <p className="text-muted-foreground py-4 text-center text-sm">Analysis failed. Please try again.</p>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{data.competitor.domain}</CardTitle>
        <div className="flex gap-1.5">
          {data.demo ? <Badge variant="warning">Demo data</Badge> : <Badge variant="success">{data.provider}</Badge>}
          <Badge variant="secondary">{data.organicKeywords.length} keywords</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Est. traffic" value={String(data.estimatedTraffic.total)} />
          <Stat label="Overlap" value={String(data.estimatedTraffic.trackedOverlap)} />
          <Stat label="Common KWs" value={String(data.keywordOverlap.common.length)} />
        </div>

        {data.topPages.length > 0 ? (
          <div>
            <p className="mb-1.5 text-xs font-semibold tracking-wide uppercase">Top pages</p>
            <div className="space-y-1">
              {data.topPages.slice(0, 5).map((p) => (
                <div key={p.url} className="flex items-center justify-between gap-2 rounded border px-3 py-1.5 text-xs">
                  <span className="truncate font-medium">{p.url}</span>
                  <span className="text-muted-foreground shrink-0">{p.keywords} kws · {p.traffic} visits</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead className="text-right">Vol</TableHead>
                <TableHead className="text-right">Pos</TableHead>
                <TableHead>Intent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.organicKeywords.slice(0, 15).map((k) => (
                <TableRow key={k.keyword}>
                  <TableCell className="font-medium">{k.keyword}</TableCell>
                  <TableCell className="text-right">{k.search_volume ?? "-"}</TableCell>
                  <TableCell className="text-right">{k.position ?? "-"}</TableCell>
                  <TableCell>{k.intent ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
