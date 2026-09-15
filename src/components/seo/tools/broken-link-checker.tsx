"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiPost } from "@/lib/client";
import type { BrokenLinksResult } from "@/services/ToolsService";

const VARIANT: Record<string, "destructive" | "secondary" | "default" | "outline"> = {
  broken: "destructive",
  server_error: "destructive",
  timeout: "secondary",
  blocked: "secondary",
  redirected: "secondary",
  failed: "outline",
};

export function BrokenLinkChecker() {
  const [url, setUrl] = useState("https://example.com");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BrokenLinksResult | null>(null);

  async function check() {
    setLoading(true);
    setResult(null);
    const res = await apiPost<BrokenLinksResult>("/api/tools/broken-links", { url, maxLinks: 50 });
    setLoading(false);
    if (res.success) setResult(res.data);
    else toast.error(res.error.message);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="bl-url">Page to scan</Label>
          <Input id="bl-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/blog-post" onKeyDown={(e) => e.key === "Enter" && !loading && check()} />
        </div>
        <Button onClick={check} disabled={loading || !url.trim()}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : null} Find broken links
        </Button>
      </div>

      {result?.error ? <p className="text-destructive text-sm">{result.error}</p> : null}

      {result && !result.error ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={result.broken.length ? "destructive" : "default"}>
              {result.broken.length ? `${result.broken.length} problem link(s)` : "All links OK"}
            </Badge>
            <span className="text-muted-foreground">{result.okCount} ok of {result.totalFound} unique links found</span>
          </div>

          {result.broken.length ? (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Link</th>
                    <th className="px-3 py-2 text-left font-medium">Anchor</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Recommended fix</th>
                  </tr>
                </thead>
                <tbody>
                  {result.broken.map((link) => (
                    <tr key={link.url} className="border-t">
                      <td className="max-w-72 truncate px-3 py-2 font-mono text-xs">{link.url}</td>
                      <td className="max-w-40 truncate px-3 py-2 text-xs">{link.anchorText || "-"}</td>
                      <td className="px-3 py-2">
                        <Badge variant={VARIANT[link.status] ?? "outline"}>{link.statusCode ? `HTTP ${link.statusCode}` : link.status}</Badge>
                      </td>
                      <td className="px-3 py-2 text-xs">{link.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
