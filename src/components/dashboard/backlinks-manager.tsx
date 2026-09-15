"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BacklinksTableBody } from "./backlinks-table";
import { Input } from "@/components/ui/input";

export type BacklinkView = "all" | "new" | "lost" | "referring-domains" | "anchors";

export interface BacklinkOverviewData {
  summary: { total: number; referring_domains: number; dofollow: number; nofollow: number };
  counts: { active: number; lost: number; dofollow: number; nofollow: number };
  provider: string;
  demo: boolean;
  synced_at: string | null;
}

export interface BacklinkListResponse {
  overview: BacklinkOverviewData;
  kind: "backlinks" | "referring-domains" | "anchors";
  rows: any[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

export const BACKLINK_VIEWS: Array<{ value: BacklinkView; label: string }> = [
  { value: "all", label: "All backlinks" },
  { value: "new", label: "New" },
  { value: "lost", label: "Lost" },
  { value: "referring-domains", label: "Referring domains" },
  { value: "anchors", label: "Anchors" },
];

export function BacklinksManager({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<BacklinkView>("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const pageSize = 25;

  const queryKey = ["project-backlinks", projectId, view, page, search];
  const { data, isLoading } = useQuery<BacklinkListResponse>({
    queryKey,
    queryFn: () =>
      apiFetch<BacklinkListResponse>(
        `/api/projects/${projectId}/backlinks?view=${view}&page=${page}&pageSize=${pageSize}${search ? `&search=${encodeURIComponent(search)}` : ""}`
      ),
  });

  const refreshAll = () => queryClient.invalidateQueries({ queryKey: ["project-backlinks", projectId] });

  const syncMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ added: number; lost: number }>(`/api/projects/${projectId}/backlinks`, {
        method: "POST",
        body: JSON.stringify({ limit: 100 }),
      }),
    onSuccess: (res) => {
      refreshAll();
      toast.success(`Synced: ${res.added} new, ${res.lost} lost`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const overview = data?.overview;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total backlinks" value={overview ? String(overview.summary.total) : "-"} />
        <StatCard label="Referring domains" value={overview ? String(overview.summary.referring_domains) : "-"} />
        <StatCard label="Dofollow" value={overview ? String(overview.summary.dofollow) : "-"} />
        <StatCard label="Lost" value={overview ? String(overview.counts.lost) : "-"} />
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Backlinks</CardTitle>
            {overview?.demo ? <Badge variant="warning">Demo data</Badge> : null}
            {overview && !overview.demo ? <Badge variant="success">{overview.provider}</Badge> : null}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Search source or domain..."
                className="w-52"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSearch(draft.trim());
                    setPage(1);
                  }
                }}
              />
              <Button
                variant="outline"
                size="icon"
                title="Search"
                onClick={() => {
                  setSearch(draft.trim());
                  setPage(1);
                }}
              >
                <Search className="size-4" />
              </Button>
            </div>
            <Button size="sm" disabled={syncMutation.isPending} onClick={() => syncMutation.mutate()}>
              {syncMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Sync now
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {BACKLINK_VIEWS.map((v) => (
              <Button
                key={v.value}
                variant={view === v.value ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setView(v.value);
                  setPage(1);
                }}
              >
                {v.label}
              </Button>
            ))}
          </div>
          <BacklinksTableBody
            data={data}
            isLoading={isLoading}
            syncPending={syncMutation.isPending}
            onSync={() => syncMutation.mutate()}
            page={page}
            setPage={setPage}
            syncedAt={overview?.synced_at ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
