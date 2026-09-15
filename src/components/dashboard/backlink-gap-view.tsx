"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, GitFork } from "lucide-react";
import { toast } from "sonner";
import { apiPost } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/client";

interface GapEntry {
  domain: string;
  backlinks: number;
  sample: Array<{ source_url: string; anchor_text: string | null }>;
}

interface GapResponse {
  project: { id: string; domain: string };
  gaps: GapEntry[];
}

export function BacklinkGapView({ projectId }: { projectId: string }) {
  const [domain, setDomain] = useState("");
  const [domains, setDomains] = useState<string[]>([]);
  const [result, setResult] = useState<GapResponse | null>(null);

  const { data: competitors } = useQuery<{ competitors: Array<{ domain: string }> }>({
    queryKey: ["gap-competitor-domains", projectId],
    queryFn: () => apiFetch<{ competitors: Array<{ domain: string }> }>(`/api/projects/${projectId}/competitors?pageSize=50`),
  });

  const mutation = useMutation({
    mutationFn: () => apiPost<GapResponse>(`/api/projects/${projectId}/backlinks/gap`, { competitor_domains: domains }),
    onSuccess: (res) => {
      if (res.success) setResult(res.data);
      else toast.error(res.error.message);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addDomain = (value: string) => {
    const clean = value.toLowerCase().trim().replace(/^https?:\/\//, "").split("/")[0] ?? "";
    if (!clean || domains.includes(clean) || domains.length >= 5) return;
    setDomains((prev) => [...prev, clean]);
    setDomain("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Backlink gap</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="competitor.com"
            onKeyDown={(e) => {
              if (e.key === "Enter") addDomain(domain);
            }}
          />
          <Button variant="outline" onClick={() => addDomain(domain)} disabled={!domain.trim()}>
            Add
          </Button>
          {competitors && competitors.competitors.length > 0 && domains.length === 0 ? (
            <Button
              variant="secondary"
              onClick={() => setDomains(competitors.competitors.slice(0, 5).map((c) => c.domain))}
            >
              Use tracked competitors
            </Button>
          ) : null}
        </div>

        {domains.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {domains.map((d) => (
              <Badge key={d} variant="secondary" className="cursor-pointer" onClick={() => setDomains((prev) => prev.filter((x) => x !== d))}>
                {d} ✕
              </Badge>
            ))}
          </div>
        ) : null}

        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || domains.length === 0}>
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <GitFork className="size-4" />}
          Find link opportunities
        </Button>

        {!result ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            Referring domains that link to your competitors but not to you — your outreach shortlist.
          </p>
        ) : result.gaps.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            No gap data for these domains.
          </p>
        ) : (
          <div className="space-y-2">
            {result.gaps.map((g) => (
              <div key={g.domain} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium">{g.domain}</p>
                  <Badge variant="default">{g.backlinks} opportunities</Badge>
                </div>
                <div className="space-y-1">
                  {g.sample.map((s) => (
                    <p key={s.source_url} className="text-muted-foreground truncate text-xs" title={s.source_url}>
                      {s.source_url}{s.anchor_text ? ` — “${s.anchor_text}”` : ""}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
