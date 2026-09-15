import Link from "next/link";
import type { Metadata } from "next";
import {
  BarChart3,
  CheckCircle2,
  FileSearch,
  Gauge,
  KeySquare,
  Link2,
  Radar,
  TrendingUp,
  Users,
} from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/constants";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/config/env";

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    "Run SEO audits, research keywords, track rankings, analyze backlinks and competitors, and generate white-label reports — all in one clean, fast platform.",
  alternates: { canonical: "/" },
};

const features = [
  {
    icon: Radar,
    title: "Site audits",
    description: "Crawl your website and find technical SEO problems before your customers do.",
  },
  {
    icon: KeySquare,
    title: "Keyword research",
    description: "Discover volumes, difficulty, CPC and intent — clustered into topics you can win.",
  },
  {
    icon: TrendingUp,
    title: "Rank tracking",
    description: "Track positions daily across search engines, countries, languages and devices.",
  },
  {
    icon: Link2,
    title: "Backlink analysis",
    description: "Monitor new and lost backlinks, referring domains and anchor texts.",
  },
  {
    icon: Users,
    title: "Competitor insights",
    description: "Compare keywords, traffic and content gaps against any competitor.",
  },
  {
    icon: FileSearch,
    title: "On-page analysis",
    description: "Instant SEO scores with actionable recommendations for every page.",
  },
  {
    icon: Gauge,
    title: "Performance",
    description: "Core Web Vitals and speed insights powered by real PageSpeed data.",
  },
  {
    icon: BarChart3,
    title: "White-label reports",
    description: "Professional PDF, CSV and Excel reports with your own branding.",
  },
];

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: APP_NAME,
        url: env.APP_URL,
        description: "All-in-one SEO platform for audits, keywords, rankings, backlinks and reports.",
      },
      {
        "@type": "WebSite",
        name: APP_NAME,
        url: env.APP_URL,
        potentialAction: {
          "@type": "SearchAction",
          target: `${env.APP_URL}/?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:py-28">
        <p className="text-primary text-sm font-semibold tracking-wide uppercase">All-in-one SEO platform</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Everything your website needs to rank. In one simple platform.
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
          {APP_NAME} combines site audits, keyword research, rank tracking, backlinks, competitors and reports — without
          the complexity of enterprise SEO suites.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/register">Start free — no credit card</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/pricing">See pricing</Link>
          </Button>
        </div>
        <ul className="text-muted-foreground mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          {["1 free project", "Real crawler", "No fabricated metrics"].map((item) => (
            <li key={item} className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-500" /> {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Features */}
      <section id="features" className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold tracking-tight">One platform, every SEO workflow</h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-2xl text-center">
            Built for businesses, agencies, marketers and developers who want results — not dashboards full of noise.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title} className="gap-3 py-5">
                <CardHeader className="px-5">
                  <span className="bg-secondary text-secondary-foreground flex size-9 items-center justify-center rounded-lg">
                    <feature.icon className="size-5" />
                  </span>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                  <CardDescription className="text-sm">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight">Ready to grow your organic traffic?</h2>
        <p className="text-muted-foreground mx-auto mt-2 max-w-xl">
          Create a free account, add your website, and see exactly what to fix first.
        </p>
        <div className="mt-6">
          <Button size="lg" asChild>
            <Link href="/register">Create your free account</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
