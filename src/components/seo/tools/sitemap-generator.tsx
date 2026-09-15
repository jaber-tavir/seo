"use client";

import { useMemo, useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateSitemap, validateSitemapEntry, type ChangeFrequency, type SitemapEntry } from "@/lib/tools/sitemap";

const EMPTY: SitemapEntry = { loc: "", lastmod: "", changefreq: "weekly", priority: 0.5 };

export function SitemapGenerator() {
  const [entries, setEntries] = useState<SitemapEntry[]>([{ ...EMPTY }, { ...EMPTY }]);
  const [includeImages, setIncludeImages] = useState(false);
  const [includeVideo, setIncludeVideo] = useState(false);

  const filled = entries.filter((e) => e.loc.trim());
  const output = useMemo(() => generateSitemap(filled, { includeImages, includeVideo }), [filled, includeImages, includeVideo]);
  const invalidCount = filled.filter((e, i) => !validateSitemapEntry(e, i).ok).length;

  function update(index: number, patch: Partial<SitemapEntry>) {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  function copy() {
    navigator.clipboard.writeText(output).then(() => toast.success("Sitemap XML copied"));
  }

  function download() {
    const blob = new Blob([output], { type: "application/xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sitemap.xml";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={includeImages} onCheckedChange={(v) => setIncludeImages(v === true)} /> Image sitemap tags
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={includeVideo} onCheckedChange={(v) => setIncludeVideo(v === true)} /> Video sitemap tags
          </label>
        </div>

        {entries.map((entry, index) => {
          const validation = validateSitemapEntry(entry, index);
          return (
            <div key={index} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={entry.loc}
                  onChange={(e) => update(index, { loc: e.target.value })}
                  placeholder={`URL ${index + 1} (https://example.com/page)`}
                  className="flex-1"
                />
                {entries.length > 1 ? (
                  <Button variant="ghost" size="icon" aria-label="Remove URL" onClick={() => setEntries((p) => p.filter((_, i) => i !== index))}>
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Last modified</Label>
                  <Input type="date" value={entry.lastmod ?? ""} max={new Date().toISOString().slice(0, 10)} onChange={(e) => update(index, { lastmod: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Change frequency</Label>
                  <Select value={entry.changefreq ?? "weekly"} onValueChange={(v) => update(index, { changefreq: v as ChangeFrequency })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"] as const).map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Priority</Label>
                  <Input type="number" min={0} max={1} step={0.1} value={entry.priority ?? 0.5} onChange={(e) => update(index, { priority: Number(e.target.value) })} />
                </div>
              </div>
              {entry.loc.trim() && !validation.ok ? <p className="text-destructive text-xs">{validation.message}</p> : null}
            </div>
          );
        })}

        <Button variant="outline" size="sm" onClick={() => setEntries((p) => [...p, { ...EMPTY }])}>
          <Plus className="size-4" /> Add URL
        </Button>
      </div>


      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex-1 text-sm font-medium">sitemap.xml</span>
          <Button size="sm" variant="outline" onClick={copy}><Check className="size-4" /> Copy</Button>
          <Button size="sm" variant="outline" onClick={download} disabled={!filled.length}><Download className="size-4" /> Download</Button>
        </div>
        {invalidCount ? <p className="text-destructive text-xs">{invalidCount} URL(s) have validation errors - fix them before exporting.</p> : null}
        <pre className="bg-muted max-h-96 min-h-48 overflow-auto rounded-lg p-4 text-xs leading-relaxed">
          <code>{output || "<!-- Add URLs to generate the sitemap -->"}</code>
        </pre>
        <p className="text-muted-foreground text-xs">Upload to your site root and reference it from robots.txt.</p>
      </div>
    </div>
  );
}


