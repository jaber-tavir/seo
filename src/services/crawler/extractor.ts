import { load } from "cheerio";
import type { AnyNode } from "domhandler";

/**
 * HTML → structured on-page data used by the crawler.
 * Uses Cheerio (pure JS, no browser) - captures everything the SEO checks need.
 */

export interface ExtractedImage {
  src: string;
  alt: string;
  hasWidth: boolean;
  hasHeight: boolean;
}

export interface ExtractedLink {
  href: string;
  anchor: string;
  rel: string;
  isNoFollow: boolean;
}

export interface ExtractedPage {
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  robotsMeta: string[] | null;
  h1: string[];
  h2: string[];
  h3: string[];
  wordCount: number;
  textContent: string;
  images: ExtractedImage[];
  imagesMissingAlt: number;
  links: ExtractedLink[];
  openGraph: Record<string, string>;
  twitterCard: Record<string, string>;
  hasJsonLd: boolean;
  jsonLdTypes: string[];
  lang: string | null;
  viewport: string | null;
  hasDescriptionMeta: boolean;
  schemeTags: string[]; // http:// schemes on an https page (mixed-content hints)
}

const MAX_DOM_CHARS = 2_000_000;

export function extractHtml(html: string, baseUrl: string): ExtractedPage {
  const $ = load(html.length > MAX_DOM_CHARS ? html.slice(0, MAX_DOM_CHARS) : html);

  const abs = (href: string | undefined): string => {
    if (!href || !href.trim()) return "";
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      return href;
    }
  };

  const title = (() => {
    const raw = $("head title").first().text().trim();
    return raw.length > 0 ? raw.slice(0, 500) : null;
  })();

  const getAttr = (node: AnyNode | undefined, name: string): string => {
    if (!node || !("attribs" in node)) return "";
    const attribs = (node as { attribs?: Record<string, string> }).attribs;
    return String(attribs?.[name] ?? "");
  };

  const metaByProp = (prop: string): string | null => {
    let found: string | null = null;
    $("meta").each((_, el) => {
      if (found) return;
      const key = (getAttr(el, "property") || getAttr(el, "name")).toLowerCase();
      if (key === prop) found = getAttr(el, "content");
    });
    return found;
  };

  const metaDescription = metaByProp("description") ?? metaByProp("og:description");
  const canonicalEl = $('link[rel="canonical"]').first().attr("href");
  const canonical = canonicalEl ? abs(canonicalEl) : null;

  const robotsMeta = $("meta[name]")
    .toArray()
    .map((el) => {
      const name = getAttr(el, "name").toLowerCase();
      if (name === "robots" || name === "googlebot") return getAttr(el, "content").toLowerCase();
      return "";
    })
    .filter(Boolean);

  const headings = (tag: string): string[] =>
    $(tag)
      .toArray()
      .slice(0, 40)
      .map((el) => $(el).text().trim().replace(/\s+/g, " ").slice(0, 500))
      .filter(Boolean);

  const text = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = text ? text.split(" ").filter(Boolean).length : 0;

  const images: ExtractedImage[] = [];
  let imagesMissingAlt = 0;
  for (const img of $("img").toArray().slice(0, 500)) {
    const src = abs(getAttr(img, "src") || getAttr(img, "data-src"));
    const alt = getAttr(img, "alt");
    const hasWidth = Boolean(getAttr(img, "width")) || Boolean(getAttr(img, "data-width"));
    const hasHeight = Boolean(getAttr(img, "height")) || Boolean(getAttr(img, "data-height"));
    if (!alt) imagesMissingAlt += 1;
    if (src) images.push({ src, alt, hasWidth, hasHeight });
  }
  const links: ExtractedLink[] = [];
  for (const a of $("a[href]").toArray().slice(0, 2000)) {
    const href = getAttr(a, "href");
    if (!href.trim() || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    const rel = getAttr(a, "rel").toLowerCase();
    links.push({
      href: abs(href),
      anchor: $(a).text().trim().replace(/\s+/g, " ").slice(0, 500),
      rel,
      isNoFollow: rel.includes("nofollow"),
    });
  }

  const openGraph: Record<string, string> = {};
  const twitterCard: Record<string, string> = {};
  for (const el of $("meta[property], meta[name]").toArray()) {
    const prop = (getAttr(el, "property") || getAttr(el, "name")).toLowerCase();
    const content = getAttr(el, "content");
    if (prop.startsWith("og:")) openGraph[prop.slice(3)] = content;
    if (prop.startsWith("twitter:")) twitterCard[prop.slice(8)] = content;
  }

  const jsonLdTypes: string[] = [];
  for (const script of $('script[type="application/ld+json"]').toArray().slice(0, 5)) {
    const raw = $(script).text().trim();
    if (!raw) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      const collect = (node: unknown): void => {
        if (!node || typeof node !== "object") return;
        if (Array.isArray(node)) {
          node.forEach(collect);
          return;
        }
        const obj = node as Record<string, unknown>;
        const type = obj["@type"];
        if (typeof type === "string") jsonLdTypes.push(type);
        else if (Array.isArray(type)) jsonLdTypes.push(...type.filter((t) => typeof t === "string"));
        for (const value of Object.values(obj)) collect(value);
      };
      collect(parsed);
    } catch {
      // invalid JSON-LD ignored
    }
  }

  const htmlEl = $("html").toArray()[0];
  const lang = htmlEl ? getAttr(htmlEl, "lang") || null : null;

  const schemeTags: string[] = [];
  if (baseUrl.startsWith("https:")) {
    for (const img of images) {
      if (img.src.startsWith("http://")) schemeTags.push("http-image");
    }
    for (const link of links) {
      if (link.href.startsWith("http://")) schemeTags.push("http-link");
    }
  }

  return {
    title,
    metaDescription,
    canonical,
    robotsMeta: robotsMeta.length > 0 ? robotsMeta : null,
    h1: headings("h1"),
    h2: headings("h2"),
    h3: headings("h3"),
    wordCount,
    textContent: text.slice(0, 500_000),
    images,
    imagesMissingAlt,
    links,
    openGraph,
    twitterCard,
    hasJsonLd: jsonLdTypes.length > 0,
    jsonLdTypes,
    lang,
    viewport: metaByProp("viewport"),
    hasDescriptionMeta: Boolean(metaByProp("description")),
    schemeTags,
  };
}