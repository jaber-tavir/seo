/** XML sitemap generation (standard, image, video) */

export type ChangeFrequency = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

export interface SitemapImage {
  url: string;
  title?: string;
  caption?: string;
}

export interface SitemapVideo {
  thumbnail: string;
  title: string;
  description: string;
  contentUrl: string;
  durationSeconds?: number;
}

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: ChangeFrequency;
  priority?: number;
  images?: SitemapImage[];
  video?: SitemapVideo;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface SitemapOptions {
  includeImages: boolean;
  includeVideo: boolean;
}

const VIDEO_NS = "xmlns:video=\"http://www.google.com/schemas/sitemap-video/1.1\"";
const IMAGE_NS = "xmlns:image=\"http://www.google.com/schemas/sitemap-image/1.1\"";

export function generateSitemap(entries: SitemapEntry[], options: SitemapOptions): string {
  const hasImages = options.includeImages && entries.some((e) => e.images?.length);
  const hasVideo = options.includeVideo && entries.some((e) => e.video);

  const rootAttrs = ["xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\""];
  if (hasImages) rootAttrs.push(IMAGE_NS);
  if (hasVideo) rootAttrs.push(VIDEO_NS);

  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', `<urlset ${rootAttrs.join(" ")}>`];

  for (const entry of entries) {
    if (!entry.loc.trim()) continue;
    lines.push("  <url>");
    lines.push(`    <loc>${xmlEscape(entry.loc.trim())}</loc>`);
    if (entry.lastmod?.trim()) lines.push(`    <lastmod>${xmlEscape(entry.lastmod.trim())}</lastmod>`);
    if (entry.changefreq) lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    if (typeof entry.priority === "number")
      lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);

    if (hasImages) {
      for (const image of entry.images ?? []) {
        if (!image.url.trim()) continue;
        lines.push("    <image:image>");
        lines.push(`      <image:loc>${xmlEscape(image.url.trim())}</image:loc>`);
        if (image.title?.trim()) lines.push(`      <image:title>${xmlEscape(image.title.trim())}</image:title>`);
        if (image.caption?.trim())
          lines.push(`      <image:caption>${xmlEscape(image.caption.trim())}</image:caption>`);
        lines.push("    </image:image>");
      }
    }

    if (hasVideo && entry.video) {
      const v = entry.video;
      if (v.thumbnail.trim() && v.title.trim() && v.contentUrl.trim()) {
        lines.push("    <video:video>");
        lines.push(`      <video:thumbnail_loc>${xmlEscape(v.thumbnail.trim())}</video:thumbnail_loc>`);
        lines.push(`      <video:title>${xmlEscape(v.title.trim())}</video:title>`);
        lines.push(`      <video:description>${xmlEscape(v.description.trim())}</video:description>`);
        lines.push(`      <video:content_loc>${xmlEscape(v.contentUrl.trim())}</video:content_loc>`);
        if (v.durationSeconds && v.durationSeconds > 0)
          lines.push(`      <video:duration>${Math.round(v.durationSeconds)}</video:duration>`);
        lines.push("    </video:video>");
      }
    }

    lines.push("  </url>");
  }

  lines.push("</urlset>");
  return lines.join("\n");
}

/** Validation results for the sitemap UI */
export interface SitemapValidation {
  index: number;
  ok: boolean;
  message: string;
}

export function validateSitemapEntry(entry: SitemapEntry, index: number): SitemapValidation {
  const loc = entry.loc.trim();
  if (!loc) return { index, ok: false, message: "URL is required" };
  try {
    const url = new URL(loc);
    if (!/^https?:$/.test(url.protocol)) return { index, ok: false, message: "Only http(s) URLs are allowed" };
    if (url.pathname.split("/").length > 30) return { index, ok: false, message: "URL path is unreasonably deep" };
    if (typeof entry.priority === "number" && (entry.priority < 0 || entry.priority > 1))
      return { index, ok: false, message: "Priority must be between 0.0 and 1.0" };
    if (entry.lastmod?.trim()) {
      const d = new Date(entry.lastmod);
      if (Number.isNaN(d.getTime())) return { index, ok: false, message: "Invalid last modified date" };
      if (d.getTime() > Date.now()) return { index, ok: false, message: "Last modified date is in the future" };
    }
    return { index, ok: true, message: "OK" };
  } catch {
    return { index, ok: false, message: "Invalid URL" };
  }
}
