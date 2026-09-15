/** robots.txt generation */

export type RobotsPreset = "allowAll" | "disallowAll" | "custom";

export interface RobotsRule {
  userAgent: string;
  allows: string[];
  disallows: string[];
  crawlDelay?: number;
}

export interface RobotsInput {
  preset: RobotsPreset;
  sitemapUrl: string;
  rules: RobotsRule[];
}

export function generateRobotsTxt(input: RobotsInput): string {
  const groups: string[] = [];

  if (input.preset === "allowAll") {
    groups.push("User-agent: *\nAllow: /");
  } else if (input.preset === "disallowAll") {
    groups.push("User-agent: *\nDisallow: /");
  } else {
    for (const rule of input.rules) {
      if (!rule.userAgent.trim()) continue;
      const lines: string[] = [`User-agent: ${rule.userAgent.trim()}`];
      for (const a of rule.allows) if (a.trim()) lines.push(`Allow: ${a.trim()}`);
      for (const d of rule.disallows) if (d.trim()) lines.push(`Disallow: ${d.trim()}`);
      if (rule.crawlDelay && rule.crawlDelay > 0) lines.push(`Crawl-delay: ${rule.crawlDelay}`);
      if (lines.length > 1) groups.push(lines.join("\n"));
    }
    if (groups.length === 0) groups.push("User-agent: *\nAllow: /");
  }

  let out = groups.join("\n\n");
  const sitemap = input.sitemapUrl.trim();
  if (sitemap) out += `\n\nSitemap: ${sitemap}`;
  return out.replace(/^\n+/, "") + "\n";
}
