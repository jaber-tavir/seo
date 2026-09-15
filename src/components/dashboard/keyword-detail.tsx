"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageAreaChart } from "@/components/charts/usage-area-chart";
import { formatDate } from "@/lib/utils";

interface HistoryPoint {
  id: string;
  position: number | null;
  previous_position: number | null;
  best_position: number | null;
  ranking_url: string | null;
  search_engine: string;
  device: string;
  country: string;
  checked_at: string;
}

interface DetailResponse {
  keyword: {
    id: string;
    keyword: string;
    search_volume: number | null;
    difficulty: number | null;
    country: string;
    language: string;
  };
  history: HistoryPoint[];
}

export function KeywordDetail({ projectId, keywordId }: { projectId: string; keywordId: string }) {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useQuery<DetailResponse>({
    queryKey: ["keyword-detail", keywordId],
    queryFn: () => apiFetch<DetailResponse>(`/api/projects/${projectId}/keywords/${keywordId}/history`),
  });

  if (isLoading) return <p className="text-muted-foreground py-6 text-center text-sm">Loading keyword history...</p>;
  if (!data) return <p className="text-muted-foreground py-6 text-center text-sm">Keyword not found.</p>;

  const points = data.history.slice(-days);
  const chart = points.map((p) => ({
    period: new Date(p.checked_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    amount: p.position ?? 101,
  }));
  const latest = data.history[data.history.length - 1];
  const first = data.history[0];
  const overall = latest && first ? (first.position ?? 101) - (latest.position ?? 101) : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Search volume" value={data.keyword.search_volume !== null ? String(data.keyword.search_volume) : "-"} />
        <Stat label="Difficulty" value={data.keyword.difficulty !== null ? `${data.keyword.difficulty}/100` : "-"} />
        <Stat label="Current position" value={latest?.position != null ? String(latest.position) : "-"} />
        <Stat label="Overall change" value={overall === null ? "-" : `${overall > 0 ? "+" : ""}${overall}`} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Position history</CardTitle>
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
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
          {chart.length > 1 ? (
            <UsageAreaChart data={chart} label="Position" />
          ) : (
            <p className="text-muted-foreground py-8 text-center text-sm">Run rank checks to build position history.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checkpoints ({data.history.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-y">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Checked</th>
                <th className="px-4 py-2 text-right font-medium">Position</th>
                <th className="px-4 py-2 text-left font-medium">Engine / device</th>
                <th className="px-4 py-2 text-left font-medium">URL</th>
              </tr>
            </thead>
            <tbody>
              {[...data.history].reverse().slice(0, 30).map((h) => (
                <tr key={h.id} className="border-b last:border-0">
                  <td className="px-4 py-2">{formatDate(h.checked_at)}</td>
                  <td className="px-4 py-2 text-right font-medium">{h.position ?? "-"}</td>
                  <td className="text-muted-foreground px-4 py-2 text-xs">{h.search_engine} / {h.device} / {h.country.toUpperCase()}</td>
                  <td className="max-w-56 truncate px-4 py-2 text-xs">{h.ranking_url ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="text-sm">
        <Link href={`/projects/${projectId}/keywords`} className="text-primary underline-offset-4 hover:underline">
          Back to keywords
        </Link>
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
