"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateMetaTags } from "@/lib/tools/meta-tags";

interface FormState {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: string;
  twitterCard: string;
  twitterSite: string;
}

const INITIAL: FormState = {
  title: "",
  description: "",
  canonical: "",
  robots: "index, follow",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  ogType: "website",
  twitterCard: "summary_large_image",
  twitterSite: "",
};

export function MetaTagGenerator() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [copied, setCopied] = useState(false);

  const html = useMemo(
    () =>
      generateMetaTags({
        title: form.title,
        description: form.description,
        canonicalUrl: form.canonical,
        robots: form.robots,
        ogTitle: form.ogTitle,
        ogDescription: form.ogDescription,
        ogImage: form.ogImage,
        ogType: form.ogType,
        twitterCard: form.twitterCard,
        twitterSite: form.twitterSite,
        keywords: "",
        author: "",
        viewport: false,
        charset: false,
      }),
    [form]
  );
  const titleLeft = 60 - form.title.length;
  const descLeft = 160 - form.description.length;

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  async function copy() {
    await navigator.clipboard.writeText(html);
    setCopied(true);
    toast.success("Meta tags copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mt-title">
            Meta title <span className={titleLeft < 0 ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>{form.title.length}/60</span>
          </Label>
          <Input id="mt-title" value={form.title} onChange={set("title")} placeholder="Best Running Shoes 2026" maxLength={120} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mt-desc">
            Meta description <span className={descLeft < 0 ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>{form.description.length}/160</span>
          </Label>
          <Textarea id="mt-desc" value={form.description} onChange={set("description")} placeholder="Compare the best running shoes..." className="min-h-20" maxLength={320} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mt-canonical">Canonical URL</Label>
            <Input id="mt-canonical" value={form.canonical} onChange={set("canonical")} placeholder="https://example.com/page" />
          </div>
          <div className="space-y-2">
            <Label>Robots directive</Label>
            <Select value={form.robots} onValueChange={(v) => setForm((p) => ({ ...p, robots: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="index, follow">index, follow</SelectItem>
                <SelectItem value="noindex, follow">noindex, follow</SelectItem>
                <SelectItem value="index, nofollow">index, nofollow</SelectItem>
                <SelectItem value="noindex, nofollow">noindex, nofollow</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mt-og-title">OG title (optional)</Label>
            <Input id="mt-og-title" value={form.ogTitle} onChange={set("ogTitle")} placeholder="Defaults to meta title" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mt-og-image">OG image URL</Label>
            <Input id="mt-og-image" value={form.ogImage} onChange={set("ogImage")} placeholder="https://example.com/og.png" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mt-og-desc">OG description (optional)</Label>
            <Input id="mt-og-desc" value={form.ogDescription} onChange={set("ogDescription")} placeholder="Defaults to meta description" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mt-tw-site">Twitter @handle</Label>
            <Input id="mt-tw-site" value={form.twitterSite} onChange={set("twitterSite")} placeholder="@yourbrand" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Generated HTML</span>
          <Button size="sm" variant="outline" onClick={copy}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />} Copy
          </Button>
        </div>
        <pre className="bg-muted overflow-auto rounded-lg p-4 text-xs leading-relaxed" data-testid="meta-output">
          <code>{html || "<!-- Fill in the fields to generate meta tags -->"}</code>
        </pre>
        <p className="text-muted-foreground text-xs">
          Paste this block inside the <code>{'<head>'}</code> of your page. Empty optional fields are omitted.
        </p>
      </div>
    </div>
  );
}
