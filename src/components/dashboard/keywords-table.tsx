"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Minus, Play, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, apiPost } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface KeywordRow {
  id: string;
  keyword: string;
  search_volume: number | null;
  difficulty: number | null;
  cpc: number | null;
  competition: string | null;
  intent: string | null;
  position: number | null;
  position_change: number | null;
  best_position: number | null;
  cluster: string | null;
}

interface KeywordsResponse {
  keywords: KeywordRow[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

const INTENT_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  informational: "secondary",
  commercial: "default",
  transactional: "default",
  navigational: "outline",
};

function ChangeBadge({ change }: { change: number | null }) {
  if (change === null || change === 0)
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
        <Minus className="size-3" />-
      </span>
    );
  const up = change > 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${up ? "text-emerald-600" : "text-red-600"}`}>
      {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {up ? "+" : ""}{change}
    </span>
  );
}

export function KeywordsTable({ projectId }: { projectId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const pageSize = 25;

  const queryKey = ["project-keywords", projectId, page, search];
  const { data, isLoading } = useQuery<KeywordsResponse>({
    queryKey,
    queryFn: () =>
      apiFetch<KeywordsResponse>(
        `/api/projects/${projectId}/keywords?page=${page}&pageSize=${pageSize}${search ? `&search=${encodeURIComponent(search)}` : ""}`
      ),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["project-keywords", projectId] });

  const trackMutation = useMutation({
    mutationFn: (keyword: string) =>
      apiFetch<{ id: string }>(`/api/projects/${projectId}/keywords`, {
        method: "POST",
        body: JSON.stringify({ keyword }),
      }),
    onSuccess: () => {
      setNewKeyword("");
      refresh();
      toast.success("Keyword added to tracking");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const checkMutation = useMutation({
    mutationFn: (keywordId: string) => apiPost(`/api/projects/${projectId}/keywords/${keywordId}/check`, {}),
    onSuccess: (res) => {
      if (res.success) {
        refresh();
        const pos = (res.data as { position: number | null }).position;
        toast.success(pos === null ? "Checked - not in top results" : `Checked - position ${pos}`);
      } else toast.error(res.error.message);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (keywordId: string) =>
      apiFetch(`/api/projects/${projectId}/keywords/${keywordId}`, { method: "DELETE" }),
    onSuccess: () => {
      refresh();
      toast.success("Keyword removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rows = data?.keywords ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-52 flex-1 space-y-1.5">
          <Label htmlFor="kw-add">Track a new keyword</Label>
          <Input
            id="kw-add"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="e.g. lisbon airport transfer"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newKeyword.trim() && !trackMutation.isPending) trackMutation.mutate(newKeyword.trim());
            }}
          />
        </div>
        <Button onClick={() => newKeyword.trim() && trackMutation.mutate(newKeyword.trim())} disabled={trackMutation.isPending || !newKeyword.trim()}>
          Add keyword
        </Button>
        <div className="relative min-w-44 flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                setSearch(draft.trim());
              }
            }}
            placeholder="Search tracked keywords..."
            className="pl-8"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground py-6 text-center text-sm">Loading keywords...</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          {search ? "No keywords match your search." : "No keywords tracked yet - add your first keyword above."}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead className="text-right">Volume</TableHead>
                <TableHead className="text-right">Difficulty</TableHead>
                <TableHead>Intent</TableHead>
                <TableHead className="text-right">Position</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead>Cluster</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <button
                      className="font-medium underline-offset-4 hover:underline"
                      onClick={() => router.push(`/projects/${projectId}/keywords/${row.id}`)}
                    >
                      {row.keyword}
                    </button>
                    {row.best_position !== null ? (
                      <span className="text-muted-foreground block text-xs">best: {row.best_position}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">{row.search_volume ?? "-"}</TableCell>
                  <TableCell className="text-right">{row.difficulty ?? "-"}</TableCell>
                  <TableCell>
                    {row.intent ? <Badge variant={INTENT_VARIANT[row.intent] ?? "secondary"}>{row.intent}</Badge> : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-right font-medium">{row.position ?? "-"}</TableCell>
                  <TableCell className="text-right"><ChangeBadge change={row.position_change} /></TableCell>
                  <TableCell className="text-muted-foreground max-w-40 truncate text-xs">{row.cluster ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button variant="ghost" size="icon" title="Check rank now" disabled={checkMutation.isPending} onClick={() => checkMutation.mutate(row.id)}>
                        <Play className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Remove" onClick={() => deleteMutation.mutate(row.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {data && data.pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.totalPages} - {data.pagination.total} keywords
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
