import { env } from "@/config/env";

/**
 * Minimal robots.txt parser.
 * Supports: User-agent wildcard rules, Disallow/Allow, Sitemap, and
 * crawl-delay (with a floor). Handles *-suffix and $-end anchoring.
 */

export interface RobotsRules {
  disallows: string[];
  allows: string[];
  sitemaps: string[];
  crawlDelayMs: number;
}

export class RobotsTxtParser {
  private rules: RobotsRules = { disallows: [], allows: [], sitemaps: [], crawlDelayMs: 0 };

  constructor(raw: string, userAgent: string) {
    this.parse(raw, userAgent);
  }

  private parse(raw: string, userAgent: string): void {
    let inGroup = false;
    const agentTokens = userAgent.toLowerCase().split(/[\s]+/);

    for (const line of raw.split(/\r?\n/)) {
      const stripped = line.split("#", 1)[0].trim();
      if (!stripped) continue;

      const sep = stripped.indexOf(":");
      if (sep === -1) continue;
      const field = stripped.slice(0, sep).trim().toLowerCase();
      const value = stripped.slice(sep + 1).trim();
      if (!value) continue;

      if (field === "user-agent") {
        let applies = value.toLowerCase() === "*";
        for (const token of agentTokens) {
          if (value.toLowerCase().includes(token)) {
            applies = true;
            break;
          }
        }
        inGroup = applies;
        continue;
      }

      if (!inGroup) continue;

      if (field === "disallow") {
        this.rules.disallows.push(value);
      } else if (field === "allow") {
        this.rules.allows.push(this.normalize(value));
      } else if (field === "sitemap") {
        this.rules.sitemaps.push(value);
      } else if (field === "crawl-delay") {
        const seconds = Number(value);
        if (Number.isFinite(seconds) && seconds > 0) {
          this.rules.crawlDelayMs = Math.max(this.rules.crawlDelayMs, Math.floor(seconds * 1000));
        }
      }
    }
  }

  private normalize(pattern: string): string {
    if (pattern === "/") return "/";
    return pattern.startsWith("/") ? pattern : `/${pattern}`;
  }

  /** Pattern-to-regex per RFC 9309 (Google's robots.txt spec). */
  private patternToRegex(pattern: string): RegExp {
    let source = "^";
    let i = 0;
    while (i < pattern.length) {
      const char = pattern[i];
      if (char === "*") {
        source += ".*";
      } else if (char === "$" && i === pattern.length - 1) {
        source += "$";
      } else if (char === "\\") {
        source += "\\\\";
      } else if ("+?^${}()|[]".includes(char!)) {
        source += `\\${char}`;
      } else {
        source += char;
      }
      i += 1;
    }
    if (!pattern.endsWith("$")) source += ".*";
    return new RegExp(source, "i");
  }

  /** Match against the full path INCLUDING the query string (per spec). */
  private matches(pattern: string, fullPath: string): boolean {
    return this.patternToRegex(pattern).test(fullPath);
  }

  /** RFC 9309 longest-match: score = pattern length; ties prefer Allow. */
  isAllowed(path: string): boolean {
    if (this.rules.disallows.length === 0 && this.rules.allows.length === 0) return true;

    let bestAllow = -1;
    let bestDisallow = -1;

    for (const a of this.rules.allows) {
      if (this.matches(a, path)) bestAllow = Math.max(bestAllow, a.length);
    }
    for (const d of this.rules.disallows) {
      if (this.matches(d, path)) bestDisallow = Math.max(bestDisallow, d.length);
    }

    if (bestAllow === -1 && bestDisallow === -1) return true;
    return bestAllow >= bestDisallow;
  }

  getSitemaps(): string[] {
    return this.rules.sitemaps;
  }

  getCrawlDelayMs(): number {
    return Math.min(this.rules.crawlDelayMs, env.CRAWLER_CRAWL_DELAY_MAX_MS);
  }
}