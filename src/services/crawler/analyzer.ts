import { type ExtractedPage } from "./extractor";

/**
 * On-page SEO analyzer - turns extracted page data into SeoIssue-style records.
 * Thresholds follow common industry guidance and are documented inline.
 */

export type IssueSeverity = "critical" | "high" | "medium" | "low";
export type IssueType = "error" | "warning" | "notice";

export interface SeoCheck {
  type: IssueType;
  severity: IssueSeverity;
  title: string;
  description: string;
  recommendation: string;
}

export interface AnalyzerInput {
  url: string;
  finalUrl: string;
  statusCode: number;
  responseTimeMs: number;
  pageSizeBytes: number;
  redirectCount: number;
  depth: number;
  indexable: boolean;
  extracted: ExtractedPage | null;
  seedHttps: boolean;
  targetKeyword?: string;
}

const cut = (value: string, max: number) => (value.length > max ? `${value.slice(0, max)}…` : value);

export function analyzePage(input: AnalyzerInput): SeoCheck[] {
  const checks: SeoCheck[] = [];
  const ex = input.extracted;
  const status = input.statusCode;

  // -------------------------------------------------------------- HTTP status
  if (status >= 500) {
    checks.push({ type: "error", severity: "critical", title: `Server error (${status})`, description: "Search engines and users cannot access this URL.", recommendation: "Fix the server error or remove/redirect the URL." });
  } else if (status >= 400) {
    checks.push({ type: "error", severity: "critical", title: `Page not reachable (${status})`, description: `The URL returned HTTP ${status}.`, recommendation: status === 404 ? "Restore the page or 301-redirect it to the most relevant replacement." : "Check server logs and repair the error before it hurts indexing." });
  }

  if (input.redirectCount > 0) {
    checks.push({
      type: "warning",
      severity: input.redirectCount >= 5 ? "high" : "medium",
      title: `${input.redirectCount === 1 ? "Redirect" : "Redirect chain"} (${input.redirectCount})`,
      description: `Resolved to ${cut(input.finalUrl, 140)}.`,
      recommendation: "Use a single 301 redirect (or better, a direct link) so link equity is passed in one hop.",
    });
  }

  if (status === 408 || status === 429) {
    checks.push({ type: "warning", severity: "high", title: `Crawler blocked (HTTP ${status})`, description: "The server rejected our request (timeout or rate limit).", recommendation: "If this is production behavior, check your WAF / security settings - you may be blocking search engine crawlers too." });
  }

  // -------------------------------------------------------------- Canonical & robots
  if (ex) {
    if (!ex.canonical) {
      checks.push({ type: "warning", severity: "medium", title: "Missing canonical tag", description: "No rel=canonical found; duplicate-content risk increases without one.", recommendation: "Add a self-referencing canonical tag to this page." });
    } else if (ex.canonical !== input.finalUrl.split("#")[0]) {
      checks.push({ type: "warning", severity: "high", title: "Canonical points to another URL", description: `Canonical is ${cut(ex.canonical, 140)}.`, recommendation: "Point the canonical at the URL you want indexed - otherwise this URL may not be indexed." });
    }

    const robots = ex.robotsMeta ?? [];
    const noindex = input.indexable === false || robots.some((r) => r.includes("noindex"));
    if (noindex) {
      checks.push({ type: "notice", severity: "high", title: "Page is noindex", description: "This page is excluded from search indexes.", recommendation: "Remove noindex if you want this page to rank, or confirm it should stay hidden." });
    }
  }

  // -------------------------------------------------------------- Metadata
  if (ex) {
    if (!ex.title) {
      checks.push({ type: "error", severity: "critical", title: "Missing title tag", description: "No <title> was found.", recommendation: "Add a unique, descriptive <title> of 30-60 characters that includes the target keyword." });
    } else if (ex.title.length > 63) {
      checks.push({ type: "warning", severity: "medium", title: `Title too long (${ex.title.length} chars)`, description: cut(ex.title, 140), recommendation: "Shorten the title so it is not truncated in search results (~50-60 chars)." });
    } else if (ex.title.length < 30) {
      checks.push({ type: "warning", severity: "low", title: `Title too short (${ex.title.length} chars)`, description: cut(ex.title, 140), recommendation: "Expand the title to better describe the page (30-60 characters)." });
    }

    if (!ex.metaDescription) {
      checks.push({ type: "warning", severity: "medium", title: "Missing meta description", description: "No description meta tag was found.", recommendation: "Write a compelling 120-160 character description including the main keyword." });
    } else if (ex.metaDescription.length > 165) {
      checks.push({ type: "warning", severity: "medium", title: `Meta description too long (${ex.metaDescription.length} chars)`, description: cut(ex.metaDescription, 140), recommendation: "Trim the description to under ~160 characters." });
    } else if (ex.metaDescription.length < 70) {
      checks.push({ type: "notice", severity: "low", title: "Short meta description", description: cut(ex.metaDescription, 140), recommendation: "Consider expanding the description to encourage clicks." });
    }

    if (ex.h1.length === 0) {
      checks.push({ type: "warning", severity: "high", title: "Missing H1 heading", description: "No H1 element was found.", recommendation: "Add exactly one H1 describing the page topic, with the primary keyword." });
    } else if (ex.h1.length > 1) {
      checks.push({ type: "warning", severity: "high", title: `Multiple H1 headings (${ex.h1.length})`, description: cut(ex.h1.join(" | "), 140), recommendation: "Keep exactly one H1 per page; use H2/H3 for the remaining hierarchy." });
    }
  }

  // -------------------------------------------------------------- Content & headings
  if (ex) {
    const h1 = ex.h1[0]?.toLowerCase() ?? "";
    const keyword = input.targetKeyword?.toLowerCase();

    if (ex.h2.length === 0 && ex.wordCount > 200) {
      checks.push({ type: "notice", severity: "low", title: "No H2 subheadings", description: "Long-form content without H2 subheadings is harder to scan and rank.", recommendation: "Split the content into H2 sections with descriptive headings." });
    }
    if (ex.h1.length === 1 && ex.h2.length === 0 && ex.h3.length > 0) {
      checks.push({ type: "notice", severity: "low", title: "Heading levels skipped (H1 → H3)", description: "Headings jump from H1 straight to H3.", recommendation: "Use H2 before H3 to keep a clean heading outline." });
    }

    if (status >= 200 && status < 300) {
      if (ex.wordCount < 150) {
        checks.push({ type: "warning", severity: "medium", title: `Thin content (${ex.wordCount} words)`, description: "Very little content - weak topical relevance.", recommendation: "Expand the page to at least 300 words of genuinely useful content." });
      } else if (ex.wordCount < 300) {
        checks.push({ type: "notice", severity: "low", title: `Light content (${ex.wordCount} words)`, description: "Below typical word counts for competitive terms.", recommendation: "Consider strengthening the page with more depth." });
      }
    }

    if (keyword) {
      const inTitle = ex.title?.toLowerCase().includes(keyword) ?? false;
      const inH1 = h1.includes(keyword);
      void ex.textContent;
      if (!inTitle && !inH1) {
        checks.push({ type: "warning", severity: "medium", title: "Target keyword not in title or H1", description: `"${keyword}" missing from the title tag and H1.`, recommendation: "Include the primary keyword naturally in the title and H1." });
      }
      if (ex.wordCount > 100) {
        const density = (ex.textContent.toLowerCase().split(keyword).length - 1) / ex.wordCount;
        if (density > 0.04) {
          checks.push({ type: "notice", severity: "low", title: "Possible keyword stuffing", description: "Keyword density is unusually high.", recommendation: "Rewrite to sound more natural; a 1-3% density is typical." });
        }
      }
    }
  }

  // -------------------------------------------------------------- Images
  if (ex && ex.images.length > 0) {
    if (ex.imagesMissingAlt > 0) {
      checks.push({ type: "warning", severity: "medium", title: `${ex.imagesMissingAlt} image${ex.imagesMissingAlt === 1 ? "" : "s"} missing alt text`, description: "Alt attributes are empty on some images.", recommendation: "Add descriptive alt text (the keyword only where natural)." });
    }
    const withoutDimensions = ex.images.filter((img) => !img.hasWidth || !img.hasHeight).length;
    if (withoutDimensions > 0) {
      checks.push({ type: "notice", severity: "low", title: `${withoutDimensions} image${withoutDimensions === 1 ? "" : "s"} without dimensions`, description: "Missing width/height attributes can cause layout shifts.", recommendation: "Set the intrinsic width and height on <img> tags." });
    }
  }

  // -------------------------------------------------------------- Performance
  if (input.responseTimeMs >= 2000) {
    checks.push({ type: "warning", severity: "high", title: `Slow response (${Math.round(input.responseTimeMs)} ms)`, description: "Server response time is over 2s.", recommendation: "Improve server-side speed: caching, CDN, or faster hosting." });
  } else if (input.responseTimeMs >= 1000) {
    checks.push({ type: "notice", severity: "medium", title: `Response time ${Math.round(input.responseTimeMs)} ms`, description: "Over 1s to first response.", recommendation: "Optimize server response time (TTFB)." });
  }

  const htmlBytes = ex ? input.pageSizeBytes : 0;
  if (htmlBytes >= 3_000_000) {
    checks.push({ type: "warning", severity: "high", title: `Large page (${Math.round(htmlBytes / 1024)} KB)`, description: "Page weight slows rendering and crawling.", recommendation: "Reduce HTML and inline assets; lazy-load below the fold." });
  } else if (htmlBytes >= 1_000_000) {
    checks.push({ type: "notice", severity: "medium", title: `Heavy page (${Math.round(htmlBytes / 1024)} KB)`, description: "HTML is over 1 MB.", recommendation: "Trim unused markup and move assets out of the document." });
  }

  // -------------------------------------------------------------- Mixed content / https
  if (input.seedHttps && ex) {
    if (ex.schemeTags.includes("http-image")) checks.push({ type: "warning", severity: "medium", title: "Mixed content: insecure images", description: "Some images load over plain http on an https page.", recommendation: "Make image URLs protocol-relative or https." });
    if (ex.schemeTags.includes("http-link")) checks.push({ type: "notice", severity: "low", title: "Links to http pages", description: "Some outbound links use plain http.", recommendation: "Upgrade outbound links to https where possible." });
  }

  // -------------------------------------------------------------- URL quality
  const urlPath = input.url.split("?")[0];
  if (/[A-Z]/.test(urlPath)) checks.push({ type: "notice", severity: "low", title: "Uppercase characters in URL", description: "URL contains uppercase letters.", recommendation: "Use lowercase URLs - they are more consistent for duplicate handling." });
  if (urlPath.length > 2000) checks.push({ type: "notice", severity: "low", title: "Very long URL", description: "URL exceeds 2048 characters.", recommendation: "Shorten the path and rely on a canonical URL." });

  return checks;
}