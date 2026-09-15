import { describe, expect, it } from "vitest";
import { extractHtml } from "@/services/crawler/extractor";
import { analyzePage } from "@/services/crawler/analyzer";
import { scorePage, scoreSite } from "@/services/crawler/scoring";
import { RobotsTxtParser } from "@/services/crawler/robots-parser";

describe("robots.txt parser", () => {
  it("respects disallow with longest-match-wins", () => {
    const parser = new RobotsTxtParser("User-agent: *\nDisallow: /private\nAllow: /private/open", "TestBot/1.0");
    expect(parser.isAllowed("/private/secret")).toBe(false);
    expect(parser.isAllowed("/private/open/page")).toBe(true);
    expect(parser.isAllowed("/public")).toBe(true);
  });

  it("supports wildcard and end-anchor patterns", () => {
    const parser = new RobotsTxtParser("User-agent: *\nDisallow: /*?sort=\nDisallow: /exact$", "TestBot/1.0");
    expect(parser.isAllowed("/items?sort=price")).toBe(false);
    expect(parser.isAllowed("/exact")).toBe(false);
    expect(parser.isAllowed("/exact/page")).toBe(true);
  });
});

describe("HTML extractor + analyzer + scoring", () => {
  const html = `<!doctype html><html lang="en"><head>
<title>Short</title>
<meta name="description" content="desc">
<link rel="canonical" href="https://example.com/a">
<meta property="og:title" content="OG title">
</head><body>
<h1>Heading one</h1><h1>Second H1</h1>
<p>${"word ".repeat(120)}</p>
<img src="/i.png"><img src="/j.png" alt="ok" width="10" height="10">
<a href="/b">internal</a><a href="https://other.example/x" rel="nofollow">ext</a>
<script type="application/ld+json">{"@type":"Article"}</script>
</body></html>`;

  it("extracts on-page signals", () => {
    const ex = extractHtml(html, "https://example.com/a");
    expect(ex.title).toBe("Short");
    expect(ex.h1).toHaveLength(2);
    expect(ex.wordCount).toBeGreaterThan(100);
    expect(ex.imagesMissingAlt).toBe(1);
    expect(ex.links).toHaveLength(2);
    expect(ex.hasJsonLd).toBe(true);
    expect(ex.canonical).toBe("https://example.com/a");
  });

  it("flags short titles, multiple h1, thin content and missing alt", () => {
    const checks = analyzePage({
      url: "https://example.com/a",
      finalUrl: "https://example.com/a",
      statusCode: 200,
      responseTimeMs: 300,
      pageSizeBytes: 40000,
      redirectCount: 0,
      depth: 0,
      indexable: true,
      extracted: extractHtml(html, "https://example.com/a"),
      seedHttps: true,
    });
    const titles = checks.map((c) => c.title);
    expect(titles.some((t) => t.includes("Title too short"))).toBe(true);
    expect(titles.some((t) => t.includes("Multiple H1"))).toBe(true);
    expect(titles.some((t) => t.includes("missing alt"))).toBe(true);
  });

  it("scores pages and sites deterministically", () => {
    expect(scorePage({ checks: [], indexable: true })).toBe(100);
    const bad = scorePage({
      checks: [{ type: "error", severity: "critical", title: "x", description: "y", recommendation: "z" }],
      indexable: true,
    });
    expect(bad).toBeLessThan(100);
    const site = scoreSite({ pageScores: [100, 80], pagesTotal: 2, errors: 0, warnings: 0 });
    expect(site.score).toBe(90);
    expect(site.healthScore).toBeGreaterThan(80);
  });
});
