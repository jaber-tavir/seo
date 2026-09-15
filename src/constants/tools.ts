import type { LucideIcon } from "lucide-react";
import {
  FileCode2,
  Gauge,
  Link2Off,
  MonitorSmartphone,
  Search,
  Sigma,
  Tags,
  Unplug,
} from "lucide-react";

export type ToolCategory = "On-Page SEO" | "Technical SEO" | "Content";

export interface ToolFaq {
  question: string;
  answer: string;
}

export interface ToolDefinition {
  slug: string;
  name: string;
  category: ToolCategory;
  icon: LucideIcon;
  /** H1 and metadata title */
  title: string;
  /** meta description for the indexable tool page */
  description: string;
  /** short intro paragraph shown under the H1 */
  intro: string;
  benefits: string[];
  howTo: string[];
  faqs: ToolFaq[];
}

export const TOOLS: ToolDefinition[] = [
  {
    slug: "meta-tag-generator",
    name: "Meta Tag Generator",
    category: "On-Page SEO",
    icon: Tags,
    title: "Free Meta Tag Generator — Title, Description, OG & Twitter Cards",
    description:
      "Generate copy-ready HTML meta tags for your pages: title, meta description, canonical, robots, Open Graph and Twitter Card tags. Free, instant, no sign-up.",
    intro:
      "Fill in your page details and get copy-ready HTML meta tags including Open Graph and Twitter Card markup. The generator shows live length hints so your title and description fit Google's display limits.",
    benefits: [
      "Copy-ready HTML you can paste straight into any website or CMS",
      "Live character counters to avoid truncated titles and descriptions",
      "Includes Open Graph and Twitter Card tags for social sharing",
      "Generated robots and canonical tags follow best practices",
    ],
    howTo: [
      "Enter the page title (keep it under 60 characters) and meta description (under 160 characters).",
      "Add the canonical URL and choose the robots directive for the page.",
      "Optionally add Open Graph and Twitter Card details for richer social previews.",
      "Copy the generated HTML block and paste it into the <head> of your page.",
    ],
    faqs: [
      {
        question: "What is the ideal meta title length?",
        answer:
          "Google typically displays around 50-60 characters (or ~580 pixels) of a title tag. Longer titles are truncated, so put your most important keywords first.",
      },
      {
        question: "How long should a meta description be?",
        answer:
          "Aim for 120-160 characters. Google may rewrite descriptions that are too long or too short, so describe the page accurately within that range.",
      },
      {
        question: "Do I need Open Graph and Twitter tags?",
        answer:
          "They are not a ranking factor, but they control how your page looks when shared on social networks and messaging apps, which improves click-through rates.",
      },
    ],
  },

  {
    slug: "serp-preview",
    name: "SERP Preview",
    category: "On-Page SEO",
    icon: MonitorSmartphone,
    title: "SERP Preview Tool — Google Desktop & Mobile Snippet Simulator",
    description:
      "Preview how your page appears in Google search results on desktop and mobile, with character and pixel-width estimates for the title, URL and meta description.",
    intro:
      "Simulate your Google search snippet before you publish. Enter a title, URL and meta description to see desktop and mobile previews with character and pixel-width estimates, so nothing gets truncated.",
    benefits: [
      "Desktop and mobile Google-style previews side by side",
      "Pixel-based title estimation that matches real truncation better than character counts",
      "Instant validation warnings for titles and descriptions that are too long or too short",
      "No account required - optimise any page in seconds",
    ],
    howTo: [
      "Type your SEO title, meta description and the page URL.",
      "Check the desktop and mobile previews to see how Google may display them.",
      "Fix any warnings - long titles get truncated and short descriptions waste space.",
      "Copy the validated title and description into your page's meta tags.",
    ],
    faqs: [
      {
        question: "How accurate is the pixel-width estimate?",
        answer:
          "The estimate uses average character widths for Google's desktop and mobile fonts. Google sometimes rewrites snippets, but the estimate is close enough to catch truncation before publishing.",
      },
      {
        question: "Why does Google rewrite my title?",
        answer:
          "Google may replace titles it considers irrelevant, too long, or keyword-stuffed with a version derived from the page content and anchor text. Keep titles accurate and concise to avoid rewrites.",
      },
    ],
  },
  {
    slug: "robots-txt-generator",
    name: "Robots.txt Generator",
    category: "Technical SEO",
    icon: Unplug,
    title: "Free Robots.txt Generator - Allow, Disallow & Sitemap Rules",
    description:
      "Generate a valid robots.txt file with allow/disallow rules, user-agents and a sitemap reference. Copy or download your robots.txt instantly.",
    intro:
      "Create a correct robots.txt file in seconds. Choose a preset or add custom rules per user-agent, then copy or download the result and upload it to your site root.",
    benefits: [
      "Preset templates for allow-all and disallow-all sites",
      "Per user-agent rules with wildcard path support",
      "Includes your sitemap URL so crawlers discover it faster",
      "Copy or download the file, ready to place at your domain root",
    ],
    howTo: [
      "Pick a preset (allow everything, block everything) or start custom.",
      "Add user-agent groups with Allow and Disallow paths as needed.",
      "Include your sitemap URL so search engines can find it.",
      "Download robots.txt and place it at https://yourdomain.com/robots.txt.",
    ],
    faqs: [
      {
        question: "Where must robots.txt be placed?",
        answer:
          "It must be served at the root of your domain, e.g. https://example.com/robots.txt - one per subdomain, over HTTPS.",
      },
      {
        question: "Does robots.txt hide pages from Google?",
        answer:
          "No. Disallowed pages can still appear in results without a snippet if linked elsewhere. To remove a page from the index use a noindex meta tag or an X-Robots-Tag header.",
      },
    ],
  },
  {
    slug: "sitemap-generator",
    name: "XML Sitemap Generator",
    category: "Technical SEO",
    icon: FileCode2,
    title: "XML Sitemap Generator - Standard, Image & Video Sitemaps",
    description:
      "Generate an XML sitemap from a list of URLs with last modified, change frequency and priority. Supports image and video sitemap extensions. Download instantly.",
    intro:
      "Paste your URLs and generate a valid XML sitemap, including optional image and video extensions. Set lastmod, changefreq and priority per URL, then download sitemap.xml.",
    benefits: [
      "Generates schema-valid sitemaps, image sitemaps and video sitemaps",
      "Per-URL lastmod, changefreq and priority controls",
      "Automatic escaping and namespace handling",
      "Download the finished sitemap.xml ready for upload or Search Console",
    ],
    howTo: [
      "Paste one URL per line (up to 50,000 per sitemap file).",
      "Optionally set last modified date, change frequency and priority per URL or globally.",
      "Choose whether to include image and video sitemap extensions.",
      "Download sitemap.xml, upload it to your domain root, and reference it from robots.txt.",
    ],
    faqs: [
      {
        question: "What is the URL limit per sitemap?",
        answer:
          "A single sitemap file may contain up to 50,000 URLs and must be under 50 MB uncompressed. Larger sites should use a sitemap index file that references multiple sitemaps.",
      },
      {
        question: "Does priority or changefreq matter?",
        answer:
          "Google largely ignores priority and changefreq, but respects <lastmod> when it is accurate. Include them only if you keep them correct.",
      },
    ],
  },
  {
    slug: "schema-generator",
    name: "Schema Generator",
    category: "Technical SEO",
    icon: Sigma,
    title: "JSON-LD Schema Generator - Article, FAQ, Product, LocalBusiness & More",
    description:
      "Generate valid JSON-LD structured data for Article, FAQ, Product, Organization, LocalBusiness, Person, Event, Recipe, Review, Breadcrumb, WebSite, Service and Course.",
    intro:
      "Pick a schema type, fill in the form and get validated JSON-LD ready to paste into your page. Structured data helps Google display rich results like stars, FAQs and breadcrumbs.",
    benefits: [
      "Supports 13 common schema.org types",
      "Live JSON-LD preview with syntax validation",
      "Copy or download the generated markup",
      "Follows Google's structured data guidelines",
    ],
    howTo: [
      "Select the schema type that matches your page content.",
      "Fill in the fields shown in the form (required fields are marked).",
      "Review the JSON-LD preview and the validation message.",
      "Copy the markup and add it inside a script tag with type application/ld+json on your page.",
    ],
    faqs: [
      {
        question: "Which schema format should I use?",
        answer:
          "Google recommends JSON-LD embedded in a script tag. It is easier to maintain than microdata and can be injected by tag managers.",
      },
      {
        question: "Will schema improve my rankings?",
        answer:
          "Structured data is not a direct ranking factor, but it unlocks rich results (FAQ dropdowns, review stars, breadcrumbs) which often increase click-through rate.",
      },
    ],
  },
  {
    slug: "keyword-density-checker",
    name: "Keyword Density Checker",
    category: "Content",
    icon: Search,
    title: "Keyword Density Checker - Analyse 1, 2 & 3-Word Phrases",
    description:
      "Analyse the keyword density of any text: top 1, 2 and 3-word phrases with counts and percentages, plus stop-word aware filtering.",
    intro:
      "Paste your content to see the most frequent words and phrases with their density percentages. Balanced keyword usage helps relevance without triggering over-optimisation signals.",
    benefits: [
      "Top single words, two-word and three-word phrases in one view",
      "Density percentages with over-optimisation warnings",
      "Stop-words filtered automatically for meaningful results",
      "Runs entirely in your browser - text never leaves your device",
    ],
    howTo: [
      "Paste your article, page copy or draft into the text area.",
      "Review the top keywords with their counts and density percentages.",
      "Watch the warning: density above ~3% for a single term suggests over-optimisation.",
      "Adjust your copy to distribute keywords naturally.",
    ],
    faqs: [
      {
        question: "What is a good keyword density?",
        answer:
          "There is no official target, but most SEOs keep primary keywords around 1-2% of body text. What matters more is natural language and topical coverage.",
      },
      {
        question: "Is keyword stuffing penalised?",
        answer:
          "Excessive keyword repetition violates Google's spam policies and can trigger manual actions or de-ranking. Write for readers first.",
      },
    ],
  },
  {
    slug: "redirect-checker",
    name: "Redirect Checker",
    category: "Technical SEO",
    icon: Gauge,
    title: "Redirect Checker - Follow Redirect Chains & Loops",
    description:
      "Trace the full redirect chain of any URL: every hop, status code and destination. Detect redirect loops and chains that waste crawl budget.",
    intro:
      "Enter a URL to trace every redirect hop - status codes, destinations and response times. Chains longer than three hops and redirect loops hurt crawl budget and user experience.",
    benefits: [
      "Full hop-by-hop chain with status codes and destinations",
      "Redirect loop detection with clear error reporting",
      "Flags chains longer than the recommended maximum",
      "Response time per hop for debugging slow redirects",
    ],
    howTo: [
      "Enter the full URL you want to check.",
      "Review each hop: status code, redirect type and destination.",
      "Fix loops immediately and shorten chains to a single hop where possible.",
      "Update internal links to point directly to the final destination.",
    ],
    faqs: [
      {
        question: "What is a good number of redirect hops?",
        answer:
          "Zero to one. Google follows up to about ten hops, but each hop loses a little link equity and adds latency. Update internal links to the final URL.",
      },
      {
        question: "Which redirect status should I use?",
        answer:
          "Use 301 (or 308) for permanent moves so signals consolidate; use 302/307 only for temporary changes such as maintenance pages.",
      },
    ],
  },
  {
    slug: "broken-link-checker",
    name: "Broken Link Checker",
    category: "Technical SEO",
    icon: Link2Off,
    title: "Broken Link Checker - Find 404s, 500s & Dead Links",
    description:
      "Scan a page for broken internal and external links: 404s, server errors, timeouts and redirects. Get a fix list with anchor text and source URLs.",
    intro:
      "Enter a page URL and we will fetch it, extract every link and check each one for 404s, 5xx errors, timeouts and problematic redirects - with a recommended fix for each issue.",
    benefits: [
      "Checks every link on a page, not just the status of the page itself",
      "Classifies failures: 404, 5xx, timeout, redirect chains",
      "Shows anchor text and source URL so fixes are one copy-paste away",
      "Recommended fix for each broken link",
    ],
    howTo: [
      "Enter the URL of the page you want to scan.",
      "Wait while the page is fetched and each link is verified.",
      "Review broken links with their status, anchor text and source.",
      "Fix or remove each broken link, or add a redirect for moved pages.",
    ],
    faqs: [
      {
        question: "How many broken links are acceptable?",
        answer:
          "Ideally zero. A few are tolerable, but many broken links signal neglect to users and search engines and waste crawl budget.",
      },
      {
        question: "What is the recommended fix for a 404 link?",
        answer:
          "If the target moved, link to the new URL directly (or add a 301 redirect). If the content is gone, update or remove the link.",
      },
    ],
  },
];

export function getTool(slug: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export function relatedTools(slug: string, count = 3): ToolDefinition[] {
  const tool = getTool(slug);
  if (!tool) return [];
  const sameCategory = TOOLS.filter((t) => t.slug !== slug && t.category === tool.category);
  const others = TOOLS.filter((t) => t.slug !== slug && t.category !== tool.category);
  return [...sameCategory, ...others].slice(0, count);
}

export const TOOL_SLUGS = TOOLS.map((t) => t.slug);
