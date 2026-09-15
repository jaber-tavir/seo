"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageAreaChart } from "@/components/charts/usage-area-chart";

interface RankRow {
  id: string;
  keyword: string;
  position: number | null;
  previous_position: number | null;
  position_change: number | null;
  best_position: number | null;
  ranking_url: string | null;
  checked_at: string | null;
}

interface RankOverview {
  buckets: { top3: number; top10: number; top20: number; top100: number; notRanked: number };
  trend: Array<{ date: string; avgPosition: number | null; keywords: number }>;
  keywords: RankRow[];
  total: number;
}

export function RankOverview({ projectId }: { projectId: string }) {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useQuery<RankOverview>({
    queryKey: ["rank-overview", projectId],
    queryFn: () => apiFetch<RankOverview>(`/api/projects/${projectId}/rankings`),
  });

  if (isLoading) return <p className="text-muted-foreground py-6 text-center text-sm">Loading rank data...</p>;
  if (!data || data.total === 0)
    return <p className="text-muted-foreground py-6 text-center text-sm">No keywords tracked yet - add keywords below to start tracking rankings.</p>;

  const buckets = [
    { label: "Top 3", value: data.buckets.top3 },
    { label: "Top 10", value: data.buckets.top10 },
    { label: "Top 20", value: data.buckets.top20 },
    { label: "Top 100", value: data.buckets.top100 },
    { label: "Not ranked", value: data.buckets.notRanked },
  ];
  const maxBucket = Math.max(1, ...buckets.map((b) => b.value));
  const trend = data.trend.slice(-days).map((t) => ({ period: t.date.slice(5), amount: t.avgPosition ?? 0 }));
  const movers = [...data.keywords]
    .filter((k) => k.position_change !== null && k.position_change !== 0)
    .sort((a, b) => Math.abs(b.position_change ?? 0) - Math.abs(a.position_change ?? 0))
    .slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Position distribution</CardTitle>
            <span className="text-muted-foreground text-xs">{data.total} tracked</span>
          </CardHeader>
          <CardContent className="space-y-2">
            {buckets.map((b) => (
              <div key={b.label} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0">{b.label}</span>
                <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                  <div className="bg-primary h-full rounded-full" style={{ width: `${(b.value / maxBucket) * 100}%` }} />
                </div>
                <span className="w-8 text-right font-medium">{b.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Average position trend</CardTitle>
            <div className="flex gap-1">
              {[7, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`rounded px-2 py-1 text-xs ${days === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {trend.length > 1 ? (
              <UsageAreaChart data={trend} label="Avg position" />
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">Run rank checks on consecutive days to build a trend.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {movers.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Biggest movers</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {movers.map((m) => {
              const up = (m.position_change ?? 0) > 0;
              return (
                <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.keyword}</p>
                    <p className="text-muted-foreground text-xs">
                      {m.previous_position ?? "-"} to {m.position ?? "100+"}
                    </p>
                  </div>
                  <Badge variant={up ? "default" : "destructive"} className="inline-flex items-center gap-1">
                    {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                    {up ? "+" : ""}{m.position_change}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Minus className="size-3" /> No position movement yet - run a rank check to record the first snapshot.
        </p>
      )}
    </div>
  );
}
