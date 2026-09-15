import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TOOLS, type ToolCategory } from "@/constants/tools";

export const metadata: Metadata = {
  title: "Free SEO Tools - Meta Tags, SERP Preview, Schema, Sitemap & More",
  description:
    "A growing collection of free SEO tools: meta tag generator, SERP preview, schema generator, XML sitemap generator, robots.txt generator, keyword density checker, redirect checker and broken link checker.",
  alternates: { canonical: "/tools" },
};

const CATEGORY_ORDER: ToolCategory[] = ["On-Page SEO", "Technical SEO", "Content"];

export default function ToolsIndexPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Free SEO tools</h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-2xl">
          Fast, focused utilities for everyday SEO work. No sign-up required - every tool runs instantly in your browser
          or against a single URL.
        </p>
      </div>

      <div className="mt-12 space-y-10">
        {CATEGORY_ORDER.map((category) => {
          const tools = TOOLS.filter((t) => t.category === category);
          if (!tools.length) return null;
          return (
            <section key={category}>
              <h2 className="mb-4 text-lg font-semibold">{category}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((tool) => (
                  <Link key={tool.slug} href={`/tools/${tool.slug}`} className="group">
                    <Card className="h-full transition-colors group-hover:border-primary/50">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <tool.icon className="text-primary size-5" />
                          <CardTitle className="text-base">{tool.name}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground line-clamp-3 text-sm">{tool.description}</p>
                        <span className="text-primary mt-3 inline-flex items-center gap-1 text-sm font-medium">
                          Open tool <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <p className="text-muted-foreground mt-12 text-center text-sm">
        Need audits, rank tracking and backlinks too?{" "}
        <Link href="/register" className="text-primary underline underline-offset-4">
          Create a free account
        </Link>{" "}
        <Badge variant="outline" className="ml-1">
          1 project included
        </Badge>
      </p>
    </div>
  );
}
