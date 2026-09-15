"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateRobotsTxt, type RobotsPreset, type RobotsRule } from "@/lib/tools/robots";

const EMPTY_RULE: RobotsRule = { userAgent: "*", allows: [], disallows: [], crawlDelay: undefined };

export function RobotsTxtGenerator() {
  const [preset, setPreset] = useState<RobotsPreset>("allowAll");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [rules, setRules] = useState<RobotsRule[]>([{ ...EMPTY_RULE }]);

  const output = useMemo(() => generateRobotsTxt({ preset, sitemapUrl, rules }), [preset, sitemapUrl, rules]);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success("robots.txt copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  function download() {
    const blob = new Blob([output], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "robots.txt";
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("robots.txt downloaded");
  }

  function updateRule(index: number, patch: Partial<RobotsRule>) {
    setRules((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Preset</Label>
          <Select value={preset} onValueChange={(v) => setPreset(v as RobotsPreset)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="allowAll">Allow all crawlers</SelectItem>
              <SelectItem value="disallowAll">Block all crawlers (staging)</SelectItem>
              <SelectItem value="custom">Custom rules</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {preset === "custom" ? (
          <div className="space-y-3">
            {rules.map((rule, index) => (
              <div key={index} className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={rule.userAgent}
                    onChange={(e) => updateRule(index, { userAgent: e.target.value })}
                    placeholder="User-agent (e.g. Googlebot)"
                    className="flex-1"
                  />
                  {rules.length > 1 ? (
                    <Button variant="ghost" size="icon" aria-label="Remove rule" onClick={() => setRules((p) => p.filter((_, i) => i !== index))}>
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <RuleLines label="Disallow" value={rule.disallows.join("\n")} onChange={(v) => updateRule(index, { disallows: v.split("\n") })} placeholder="Paths (one per line), e.g. /admin" />
                  <RuleLines label="Allow" value={rule.allows.join("\n")} onChange={(v) => updateRule(index, { allows: v.split("\n") })} placeholder="Paths (one per line)" />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Crawl-delay</Label>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={rule.crawlDelay ?? ""}
                    onChange={(e) => updateRule(index, { crawlDelay: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-24"
                  />
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setRules((p) => [...p, { ...EMPTY_RULE }])}>
              <Plus className="size-4" /> Add rule group
            </Button>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="rb-sitemap">Sitemap URL</Label>
          <Input id="rb-sitemap" value={sitemapUrl} onChange={(e) => setSitemapUrl(e.target.value)} placeholder="https://example.com/sitemap.xml" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex-1 text-sm font-medium">Generated robots.txt</span>
          <Button size="sm" variant="outline" onClick={copy}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />} Copy
          </Button>
          <Button size="sm" variant="outline" onClick={download}>Download</Button>
        </div>
        <pre className="bg-muted min-h-48 overflow-auto rounded-lg p-4 text-xs leading-relaxed" data-testid="robots-output">
          <code>{output}</code>
        </pre>
        <p className="text-muted-foreground text-xs">Upload this file to your site root: https://example.com/robots.txt</p>
      </div>
    </div>
  );
}

function RuleLines({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-16 w-full rounded-md border px-3 py-2 text-xs focus-visible:ring-2 focus-visible:outline-none"
      />
    </div>
  );
}
