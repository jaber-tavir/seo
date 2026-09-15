"use client";

import { useMemo, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { displayUrl, estimatePixels, validateSerp } from "@/lib/tools/serp";

export function SerpPreview() {
  const [title, setTitle] = useState("Best Running Shoes 2026 — Tested & Reviewed");
  const [description, setDescription] = useState(
    "We tested 40+ running shoes this year. Compare cushioning, stability and price to find the perfect pair for your next run."
  );
  const [url, setUrl] = useState("https://example.com/blog/best-running-shoes");

  const shown = useMemo(() => displayUrl(url), [url]);
  const titlePxDesktop = estimatePixels(title, "desktopTitle");
  const titlePxMobile = estimatePixels(title, "mobileTitle");
  const desktopChecks = useMemo(() => validateSerp(title, description, "desktop"), [title, description]);
  const mobileChecks = useMemo(() => validateSerp(title, description, "mobile"), [title, description]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sp-title">
            Title <span className="text-muted-foreground text-xs">{title.length}/60 chars · ~{titlePxDesktop}px desktop / ~{titlePxMobile}px mobile</span>
          </Label>
          <Input id="sp-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sp-desc">
            Meta description <span className="text-muted-foreground text-xs">{description.length}/160</span>
          </Label>
          <Textarea id="sp-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-20" maxLength={320} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sp-url">URL</Label>
          <Input id="sp-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/page" />
        </div>

        <div className="space-y-1.5 text-xs">
          {desktopChecks.titleChecks.map((c, i) => (
            <div key={`dt-${i}`} className={c.level === "error" ? "text-destructive" : c.level === "warning" ? "text-amber-500" : "text-emerald-600"}>
              Desktop title: {c.message}
            </div>
          ))}
          {desktopChecks.descriptionChecks.map((c, i) => (
            <div key={`dd-${i}`} className={c.level === "error" ? "text-destructive" : c.level === "warning" ? "text-amber-500" : "text-emerald-600"}>
              Desktop description: {c.message}
            </div>
          ))}
          {mobileChecks.titleChecks.map((c, i) => (
            <div key={`mt-${i}`} className={c.level === "error" ? "text-destructive" : c.level === "warning" ? "text-amber-500" : "text-emerald-600"}>
              Mobile title: {c.message}
            </div>
          ))}
          {mobileChecks.descriptionChecks.map((c, i) => (
            <div key={`md-${i}`} className={c.level === "error" ? "text-destructive" : c.level === "warning" ? "text-amber-500" : "text-emerald-600"}>
              Mobile description: {c.message}
            </div>
          ))}
        </div>
      </div>

      <div>
        <Tabs defaultValue="desktop">
          <TabsList className="mb-3">
            <TabsTrigger value="desktop" className="gap-1.5"><Monitor className="size-3.5" /> Desktop</TabsTrigger>
            <TabsTrigger value="mobile" className="gap-1.5"><Smartphone className="size-3.5" /> Mobile</TabsTrigger>
          </TabsList>
          <TabsContent value="desktop">
            <SerpCard origin={shown.origin} segments={shown.segments} title={title} description={description} />
          </TabsContent>
          <TabsContent value="mobile">
            <SerpCard origin={shown.origin} segments={shown.segments} title={title} description={description} mobile />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SerpCard(props: { origin: string; segments: string[]; title: string; description: string; mobile?: boolean }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-card" data-testid={props.mobile ? "serp-mobile" : "serp-desktop"}>
      <div className="flex items-center gap-2">
        <div className="bg-muted flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-gray-600">
          {props.origin.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-xs font-medium text-gray-800">{props.origin}</div>
          <div className="truncate text-xs text-gray-500">{props.segments.join(" › ") || "www"} · 9 Sep 2026</div>
        </div>
      </div>
      <h3 className={`mt-2 font-normal text-[#1a0dab] ${props.mobile ? "text-lg" : "text-xl"} leading-snug`}>{props.title}</h3>
      <p className={`mt-1 text-sm leading-snug text-gray-600 ${props.mobile ? "" : "max-w-prose"}`}>{props.description}</p>
    </div>
  );
}
