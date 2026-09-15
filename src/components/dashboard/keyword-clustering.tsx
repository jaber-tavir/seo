"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiPost } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface Cluster {
  primary: string;
  members: string[];
}

interface ClusterResponse {
  clusters: Cluster[];
  total: number;
}

export function KeywordClustering() {
  const [text, setText] = useState("airport transfer Lisbon\nLisbon airport transfer\nLisbon airport taxi\nLisbon airport shuttle");
  const [result, setResult] = useState<ClusterResponse | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      apiPost<ClusterResponse>("/api/keywords/cluster", {
        keywords: text.split("\n").map((l) => l.trim()).filter(Boolean),
      }),
    onSuccess: (res) => {
      if (res.success) setResult(res.data);
      else toast.error(res.error.message);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="One keyword per line (2-200 keywords)"
          />
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || text.trim().split("\n").length < 2}>
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Cluster keywords
          </Button>
        </div>

        <div>
          {!result ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
              Clusters appear here — keywords sharing significant stemmed words are grouped under one primary keyword.
            </p>
          ) : (
            <div className="space-y-2">
              {result.clusters.map((c) => (
                <Card key={c.primary}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      {c.primary}
                      <Badge variant={c.members.length > 1 ? "default" : "secondary"}>{c.members.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  {c.members.length > 1 ? (
                    <CardContent className="flex flex-wrap gap-1.5 pt-0">
                      {c.members.map((m) => (
                        <Badge key={m} variant="outline">{m}</Badge>
                      ))}
                    </CardContent>
                  ) : null}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
