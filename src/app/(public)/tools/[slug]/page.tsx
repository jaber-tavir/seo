import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { env } from "@/config/env";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TOOLS, getTool, relatedTools } from "@/constants/tools";
import { BrokenLinkChecker } from "@/components/seo/tools/broken-link-checker";
import { KeywordDensityTool } from "@/components/seo/tools/keyword-density-tool";
import { MetaTagGenerator } from "@/components/seo/tools/meta-tag-generator";
import { RedirectChecker } from "@/components/seo/tools/redirect-checker";
import { RobotsTxtGenerator } from "@/components/seo/tools/robots-txt-generator";
import { SchemaGenerator } from "@/components/seo/tools/schema-generator";
import { SerpPreview } from "@/components/seo/tools/serp-preview";
import { SitemapGenerator } from "@/components/seo/tools/sitemap-generator";

interface ToolPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return TOOLS.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return {};
  return {
    title: tool.title,
    description: tool.description,
    alternates: { canonical: `/tools/${tool.slug}` },
    openGraph: { title: tool.title, description: tool.description, url: `/tools/${tool.slug}`, type: "website" },
    twitter: { card: "summary_large_image", title: tool.title, description: tool.description },
  };
}

const TOOL_COMPONENTS: Record<string, React.ComponentType> = {
  "meta-tag-generator": MetaTagGenerator,
  "serp-preview": SerpPreview,
  "schema-generator": SchemaGenerator,
  "sitemap-generator": SitemapGenerator,
  "robots-txt-generator": RobotsTxtGenerator,
  "keyword-density-checker": KeywordDensityTool,
  "redirect-checker": RedirectChecker,
  "broken-link-checker": BrokenLinkChecker,
};

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  const ToolComponent = TOOL_COMPONENTS[tool.slug];
  if (!ToolComponent) notFound();

  const related = relatedTools(tool.slug);
  const baseUrl = env.APP_URL.replace(/\/$/, "");
  const toolUrl = `${baseUrl}/tools/${tool.slug}`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "SEO Tools", item: `${baseUrl}/tools` },
      { "@type": "ListItem", position: 3, name: tool.name, item: toolUrl },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: tool.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    url: toolUrl,
    applicationCategory: "SEOApplication",
    operatingSystem: "Web",
    description: tool.description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }} />

      <nav aria-label="Breadcrumb" className="text-muted-foreground mb-6 text-sm">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/tools" className="hover:text-foreground">SEO Tools</Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">{tool.name}</span>
      </nav>

      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <tool.icon className="text-primary size-6" />
          <span className="text-muted-foreground text-sm font-medium">{tool.category}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{tool.name}</h1>
        <p className="text-muted-foreground mt-3 max-w-3xl">{tool.intro}</p>
      </header>

      <section aria-label={`${tool.name} tool`} className="rounded-xl border p-4 sm:p-6">
        <ToolComponent />
      </section>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <section aria-labelledby="how-to-use">
          <h2 id="how-to-use" className="mb-3 text-xl font-semibold">How to use the {tool.name.toLowerCase()}</h2>
          <ol className="space-y-2">
            {tool.howTo.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="benefits">
          <h2 id="benefits" className="mb-3 text-xl font-semibold">Benefits</h2>
          <ul className="space-y-2">
            {tool.benefits.map((benefit, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                <span className="text-muted-foreground">{benefit}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="faq" className="mt-12">
        <h2 id="faq" className="mb-4 text-xl font-semibold">Frequently asked questions</h2>
        <div className="space-y-4">
          {tool.faqs.map((faq) => (
            <Card key={faq.question}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{faq.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="related" className="mt-12">
        <h2 id="related" className="mb-4 text-xl font-semibold">Related tools</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {related.map((rel) => (
            <Link key={rel.slug} href={`/tools/${rel.slug}`} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/50">
                <CardContent className="flex items-center gap-2 p-4">
                  <rel.icon className="text-primary size-4 shrink-0" />
                  <span className="text-sm font-medium">{rel.name}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
