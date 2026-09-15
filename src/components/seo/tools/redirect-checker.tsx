"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiPost } from "@/lib/client";
import type { RedirectTraceResult } from "@/services/ToolsService";

export function RedirectChecker() {
  const [url, setUrl] = useState("https://example.com");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RedirectTraceResult | null>(null);

  async function check() {
    setLoading(true);
    setResult(null);
    const res = await apiPost<RedirectTraceResult>("/api/tools/redirect-check", { url });
    setLoading(false);
    if (res.success) setResult(res.data);
    else toast.error(res.error.message);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="rc-url">URL to trace</Label>
          <Input id="rc-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/old-page" onKeyDown={(e) => e.key === "Enter" && !loading && check()} />
        </div>
        <Button onClick={check} disabled={loading || !url.trim()}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : null} Check redirects
        </Button>
      </div>

      {result?.error ? <p className="text-destructive text-sm">{result.error}</p> : null}

      {result && !result.error ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={result.loopDetected ? "destructive" : result.totalHops <= 1 ? "default" : "secondary"}>
              {result.loopDetected ? "Loop detected" : `${result.totalHops} hop(s)`}
            </Badge>
            {result.chainTooLong ? <Badge variant="secondary">Chain longer than 3 hops - link directly to the final URL</Badge> : null}
            <span className="text-muted-foreground truncate">Final URL: {result.finalUrl}</span>
          </div>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">URL</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Location</th>
                  <th className="px-3 py-2 text-right font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {result.hops.map((hop, i) => (
                  <tr key={`${hop.url}-${i}`} className="border-t">
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="max-w-72 truncate px-3 py-2 font-mono text-xs">{hop.url}</td>
                    <td className="px-3 py-2">
                      <Badge variant={hop.status >= 200 && hop.status < 300 ? "default" : hop.status >= 300 && hop.status < 400 ? "secondary" : "destructive"}>
                        {hop.status}
                      </Badge>
                    </td>
                    <td className="max-w-72 truncate px-3 py-2 text-xs">{hop.location ?? "-"}</td>
                    <td className="text-muted-foreground px-3 py-2 text-right text-xs">{hop.durationMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
