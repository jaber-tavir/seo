"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, apiPost } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface GapItem {
  keyword: string;
  search_volume: number | null;
  difficulty: number | null;
  intent: string | null;
  competitorCount: number;
  competitors: string[];
}

interface GapResponse {
  items: GapItem[];
  total: number;
}

export function ContentGapView({ projectId }: { projectId: string }) {
  const [minVolume, setMinVolume] = useState("");
  const [maxDifficulty, setMaxDifficulty] = useState("");
  const [result, setResult] = useState<GapResponse | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const qs = new URLSearchParams();
      if (minVolume) qs.set("minVolume", minVolume);
      if (maxDifficulty) qs.set("maxDifficulty", maxDifficulty);
      const suffix = qs.size > 0 ? `?${qs.toString()}` : "";
      return apiFetch<GapResponse>(`/api/projects/${projectId}/content-gap${suffix}`);
    },
    onSuccess: (data) => setResult(data),
    onError: (err: Error) => toast.error(err.message),
  });

  const trackMutation = useMutation({
    mutationFn: (keywords: string[]) => apiPost(`/api/projects/${projectId}/keywords`, { keywords }),
    onSuccess: (res) => {
      if (res.success) toast.success("Added to keyword tracking");
      else toast.error(res.error.message);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content gap finder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <p className="text-xs font-medium">Min volume</p>
              <Input value={minVolume} onChange={(e) => setMinVolume(e.target.value)} placeholder="100" className="w-28" inputMode="numeric" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium">Max difficulty</p>
              <Input value={maxDifficulty} onChange={(e) => setMaxDifficulty(e.target.value)} placeholder="50" className="w-28" inputMode="numeric" />
            </div>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />} Find gaps
            </Button>
            {result && result.items.length > 0 ? (
              <Button
                variant="outline"
                disabled={trackMutation.isPending}
                onClick={() => trackMutation.mutate(result.items.slice(0, 20).map((i) => i.keyword))}
              >
                Track top {Math.min(20, result.items.length)}
              </Button>
            ) : null}
          </div>

          {!result ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
              Keywords your competitors rank for that you don&apos;t track yet — with volume, difficulty and intent filters.
            </p>
          ) : result.items.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
              No gaps found with these filters. Try lowering the volume threshold.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead className="text-right">Difficulty</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead className="text-right">Competitors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.slice(0, 50).map((item) => (
                    <TableRow key={item.keyword}>
                      <TableCell className="font-medium">{item.keyword}</TableCell>
                      <TableCell className="text-right">{item.search_volume ?? "-"}</TableCell>
                      <TableCell className="text-right">{item.difficulty ?? "-"}</TableCell>
                      <TableCell>{item.intent ? <Badge variant="secondary">{item.intent}</Badge> : "-"}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{item.competitorCount}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
