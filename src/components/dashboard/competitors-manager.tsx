"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GitCompareArrows, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, apiPost } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CompetitorAnalysisView } from "./competitor-analysis-view";

export interface CompetitorRow {
  id: string;
  domain: string;
  name: string | null;
  created_at: string;
}

interface CompetitorsResponse {
  competitors: CompetitorRow[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

interface ComparisonData {
  competitors: Array<{ domain: string; organicKeywordCount: number; estimatedTraffic: number; overlap: number }>;
  keywordOverlap: { common: string[]; missing: string[]; unique: string[] };
}

export function CompetitorsManager({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [domain, setDomain] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [analyzedId, setAnalyzedId] = useState<string | null>(null);

  const listKey = ["project-competitors", projectId];
  const { data, isLoading } = useQuery<CompetitorsResponse>({
    queryKey: listKey,
    queryFn: () => apiFetch<CompetitorsResponse>(`/api/projects/${projectId}/competitors?pageSize=50`),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: listKey });

  const addMutation = useMutation({
    mutationFn: () => apiFetch(`/api/projects/${projectId}/competitors`, { method: "POST", body: JSON.stringify({ domain }) }),
    onSuccess: () => {
      setDomain("");
      refresh();
      toast.success("Competitor added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/projects/${projectId}/competitors/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      refresh();
      toast.success("Competitor removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const compareMutation = useMutation({
    mutationFn: () => apiPost<ComparisonData>(`/api/projects/${projectId}/competitors/compare`, { competitor_ids: selected }),
    onError: (err: Error) => toast.error(err.message),
  });

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 5)));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tracked competitors ({data?.pagination.total ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="competitor.com"
              onKeyDown={(e) => {
                if (e.key === "Enter" && domain.trim()) addMutation.mutate();
              }}
            />
            <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !domain.trim()}>
              <Plus className="size-4" /> Add
            </Button>
          </div>
          {isLoading ? (
            <p className="text-muted-foreground py-4 text-center text-sm">Loading competitors...</p>
          ) : !data || data.competitors.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
              No competitors yet — add the domains you compete with in search results.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Domain</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="w-36 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.competitors.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="size-4 accent-current"
                          checked={selected.includes(c.id)}
                          onChange={() => toggle(c.id)}
                          aria-label={`Select ${c.domain}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{c.domain}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button variant="outline" size="sm" onClick={() => setAnalyzedId(analyzedId === c.id ? null : c.id)}>
                            Analyze
                          </Button>
                          <Button variant="ghost" size="icon" title="Remove" onClick={() => deleteMutation.mutate(c.id)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {selected.length > 0 ? (
            <div className="flex items-center gap-2 pt-1">
              <Button variant="secondary" size="sm" disabled={compareMutation.isPending} onClick={() => compareMutation.mutate()}>
                {compareMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <GitCompareArrows className="size-4" />}
                Compare {selected.length} selected
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>Clear</Button>
            </div>
          ) : null}
          {compareMutation.data?.success ? <ComparisonCard data={compareMutation.data.data} /> : null}
          {analyzedId ? <CompetitorAnalysisView projectId={projectId} competitorId={analyzedId} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function ComparisonCard({ data }: { data: ComparisonData }) {
  return (
    <div className="space-y-3 pt-1">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Domain</TableHead>
              <TableHead className="text-right">Organic keywords</TableHead>
              <TableHead className="text-right">Est. traffic</TableHead>
              <TableHead className="text-right">Overlap with us</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.competitors.map((c) => (
              <TableRow key={c.domain}>
                <TableCell className="font-medium">{c.domain}</TableCell>
                <TableCell className="text-right">{c.organicKeywordCount}</TableCell>
                <TableCell className="text-right">{c.estimatedTraffic.toLocaleString()}</TableCell>
                <TableCell className="text-right">{c.overlap}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-3">
        <OverlapList title={`Common (${data.keywordOverlap.common.length})`} items={data.keywordOverlap.common} />
        <OverlapList title={`Missing (${data.keywordOverlap.missing.length})`} items={data.keywordOverlap.missing} />
        <OverlapList title={`Unique (${data.keywordOverlap.unique.length})`} items={data.keywordOverlap.unique} />
      </div>
    </div>
  );
}

function OverlapList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="mb-2 text-xs font-semibold tracking-wide uppercase">{title}</p>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-xs">None</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {items.slice(0, 20).map((k) => (
            <Badge key={k} variant="outline">{k}</Badge>
          ))}
          {items.length > 20 ? <Badge variant="secondary">+{items.length - 20} more</Badge> : null}
        </div>
      )}
    </div>
  );
}

