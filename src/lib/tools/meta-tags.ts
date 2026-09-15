/** Meta tag HTML generation */

export interface MetaTagInput {
  title: string;
  description: string;
  canonicalUrl?: string;
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  twitterSite?: string;
  keywords?: string;
  author?: string;
  viewport?: boolean;
  charset?: boolean;
}

export function generateMetaTags(input: MetaTagInput): string {
  const lines: string[] = [];
  const esc = (s: string) => s.replace(/"/g, "&quot;");
  const v = (s: string | undefined) => (s ?? "").trim();

  if (input.charset) lines.push('<meta charset="utf-8" />');
  if (input.viewport) lines.push('<meta name="viewport" content="width=device-width, initial-scale=1" />');
  if (v(input.title)) lines.push(`<title>${esc(v(input.title))}</title>`);
  if (v(input.description))
    lines.push(`<meta name="description" content="${esc(v(input.description))}" />`);
  if (v(input.keywords))
    lines.push(`<meta name="keywords" content="${esc(v(input.keywords))}" />`);
  if (v(input.author)) lines.push(`<meta name="author" content="${esc(v(input.author))}" />`);
  const robots = v(input.robots);
  const canonicalUrl = v(input.canonicalUrl);
  if (robots && robots !== "index, follow")
    lines.push(`<meta name="robots" content="${esc(robots)}" />`);
  if (canonicalUrl)
    lines.push(`<link rel="canonical" href="${esc(canonicalUrl)}" />`);

  const ogTitle = v(input.ogTitle) || v(input.title);
  const ogDesc = v(input.ogDescription) || v(input.description);
  if (ogTitle || ogDesc || v(input.ogImage)) {
    lines.push("");
    lines.push("<!-- Open Graph -->");
    lines.push('<meta property="og:site_name" content="" />');
    if (ogTitle) lines.push(`<meta property="og:title" content="${esc(ogTitle)}" />`);
    if (ogDesc) lines.push(`<meta property="og:description" content="${esc(ogDesc)}" />`);
    const ogType = v(input.ogType);
    if (ogType) lines.push(`<meta property="og:type" content="${esc(ogType)}" />`);
    if (canonicalUrl)
      lines.push(`<meta property="og:url" content="${esc(canonicalUrl)}" />`);
    if (v(input.ogImage)) lines.push(`<meta property="og:image" content="${esc(v(input.ogImage))}" />`);
  }

  lines.push("");
  lines.push("<!-- Twitter Card -->");
  const twitterCard = v(input.twitterCard);
  const twitterSite = v(input.twitterSite);
  if (twitterCard)
    lines.push(`<meta name="twitter:card" content="${esc(twitterCard)}" />`);
  if (twitterSite)
    lines.push(`<meta name="twitter:site" content="${esc(twitterSite)}" />`);
  if (ogTitle) lines.push(`<meta name="twitter:title" content="${esc(ogTitle)}" />`);
  if (ogDesc) lines.push(`<meta name="twitter:description" content="${esc(ogDesc)}" />`);
  if (v(input.ogImage)) lines.push(`<meta name="twitter:image" content="${esc(v(input.ogImage))}" />`);

  return lines.join("\n");
}
