import { describe, expect, it } from "vitest";
import { generateSitemap, validateSitemapEntry, type SitemapEntry } from "@/lib/tools/sitemap";
import { generateRobotsTxt } from "@/lib/tools/robots";
import { generateMetaTags } from "@/lib/tools/meta-tags";

const entry = (patch: Partial<SitemapEntry> = {}): SitemapEntry => ({
  loc: "https://example.com/",
  changefreq: "weekly",
  priority: 0.5,
  ...patch,
});

describe("sitemap generator", () => {
  it("produces a valid standard urlset", () => {
    const xml = generateSitemap([entry({ lastmod: "2025-01-15", priority: 1 })], { includeImages: false, includeVideo: false });
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain("<loc>https://example.com/</loc>");
    expect(xml).toContain("<lastmod>2025-01-15</lastmod>");
    expect(xml).toContain("<priority>1.0</priority>");
    expect(xml).toContain("</urlset>");
    expect(xml).not.toContain("image:");
  });

  it("escapes XML special characters", () => {
    const xml = generateSitemap([entry({ loc: "https://example.com/a?b=1&c=<2>" })], { includeImages: false, includeVideo: false });
    expect(xml).toContain("<loc>https://example.com/a?b=1&amp;c=&lt;2&gt;</loc>");
    expect(xml).not.toContain("<2>");
  });

  it("includes image namespace and image tags when requested", () => {
    const xml = generateSitemap(
      [entry({ images: [{ url: "https://example.com/pic.jpg", title: "Pic" }] })],
      { includeImages: true, includeVideo: false }
    );
    expect(xml).toContain("xmlns:image=");
    expect(xml).toContain("<image:loc>https://example.com/pic.jpg</image:loc>");
    expect(xml).toContain("<image:title>Pic</image:title>");
  });

  it("includes video tags only when fully specified", () => {
    const full = generateSitemap(
      [entry({ video: { thumbnail: "https://e.com/t.jpg", title: "V", description: "D", contentUrl: "https://e.com/v.mp4", durationSeconds: 90 } })],
      { includeImages: false, includeVideo: true }
    );
    expect(full).toContain("<video:thumbnail_loc>");
    expect(full).toContain("<video:duration>90</video:duration>");

    const incomplete = generateSitemap(
      [entry({ video: { thumbnail: "", title: "V", description: "D", contentUrl: "https://e.com/v.mp4" } })],
      { includeImages: false, includeVideo: true }
    );
    expect(incomplete).not.toContain("video:");
  });

  it("skips empty entries", () => {
    const xml = generateSitemap([entry({ loc: "  " }), entry()], { includeImages: false, includeVideo: false });
    expect(xml.match(/<url>/g)).toHaveLength(1);
  });
});

describe("validateSitemapEntry", () => {
  it("accepts valid entries", () => {
    expect(validateSitemapEntry(entry(), 0).ok).toBe(true);
    expect(validateSitemapEntry(entry({ priority: 0 }), 0).ok).toBe(true);
  });

  it("rejects invalid url, protocol, priority and future dates", () => {
    expect(validateSitemapEntry(entry({ loc: "not a url" }), 0).ok).toBe(false);
    expect(validateSitemapEntry(entry({ loc: "ftp://example.com" }), 0).ok).toBe(false);
    expect(validateSitemapEntry(entry({ priority: 1.5 }), 0).ok).toBe(false);
    expect(validateSitemapEntry(entry({ lastmod: "2099-01-01" }), 0).ok).toBe(false);
    expect(validateSitemapEntry(entry({ lastmod: "garbage" }), 0).ok).toBe(false);
    expect(validateSitemapEntry(entry({ loc: "" }), 0).ok).toBe(false);
  });
});

describe("robots.txt generator", () => {
  it("allow all preset", () => {
    expect(generateRobotsTxt({ preset: "allowAll", sitemapUrl: "", rules: [] })).toBe("User-agent: *\nAllow: /\n");
  });

  it("disallow all preset", () => {
    expect(generateRobotsTxt({ preset: "disallowAll", sitemapUrl: "", rules: [] })).toBe("User-agent: *\nDisallow: /\n");
  });

  it("custom rules with crawl-delay and sitemap", () => {
    const out = generateRobotsTxt({
      preset: "custom",
      sitemapUrl: "https://example.com/sitemap.xml",
      rules: [{ userAgent: "Googlebot", allows: ["/public"], disallows: ["/private/", ""], crawlDelay: 2 }],
    });
    expect(out).toContain("User-agent: Googlebot");
    expect(out).toContain("Allow: /public");
    expect(out).toContain("Disallow: /private/");
    expect(out).toContain("Crawl-delay: 2");
    expect(out).toContain("Sitemap: https://example.com/sitemap.xml");
    expect(out.endsWith("\n")).toBe(true);
  });

  it("falls back to allow-all when custom rules are empty", () => {
    const out = generateRobotsTxt({ preset: "custom", sitemapUrl: "", rules: [{ userAgent: "  ", allows: [], disallows: [] }] });
    expect(out).toContain("Allow: /");
  });
});


describe("meta tag generator", () => {
  const base = {
    title: "My Site",
    description: "A great site",
    canonicalUrl: "https://example.com",
    robots: "index, follow",
    ogTitle: "",
    ogDescription: "",
    ogImage: "https://example.com/og.png",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterSite: "@example",
    keywords: "",
    author: "",
    viewport: true,
    charset: true,
  };

  it("emits title, description, canonical and og/twitter blocks", () => {
    const html = generateMetaTags(base);
    expect(html).toContain("<title>My Site</title>");
    expect(html).toContain('<meta name="description" content="A great site" />');
    expect(html).toContain('<link rel="canonical" href="https://example.com" />');
    expect(html).toContain('property="og:title" content="My Site"');
    expect(html).toContain('property="og:url" content="https://example.com"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('name="twitter:image" content="https://example.com/og.png"');
  });

  it("escapes quotes in content", () => {
    const html = generateMetaTags({ ...base, title: 'Say "Hi"' });
    expect(html).toContain("<title>Say &quot;Hi&quot;</title>");
    expect(html).not.toContain('Say "Hi"');
  });

  it("omits default robots directive and empty optional fields", () => {
    const html = generateMetaTags({ ...base, robots: "index, follow", keywords: "", author: "" });
    expect(html).not.toContain('name="robots"');
    expect(html).not.toContain('name="keywords"');
    expect(html).not.toContain('name="author"');
  });

  it("emits explicit robots directive when non-default", () => {
    expect(generateMetaTags({ ...base, robots: "noindex, nofollow" })).toContain('name="robots" content="noindex, nofollow"');
  });

  it("supports charset/viewport toggles", () => {
    const minimal = generateMetaTags({ ...base, viewport: false, charset: false });
    expect(minimal).not.toContain("charset=");
    expect(minimal).not.toContain("viewport");
  });
});

