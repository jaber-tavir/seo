import type {
  AIProvider,
  AiBriefInput,
  AiBriefResult,
  AiDescriptionInput,
  AiExpandInput,
  AiFaqInput,
  AiOutlineInput,
  AiOutlineSection,
  AiRewriteInput,
  AiShortenInput,
  AiTitleInput,
  GenerateContentInput,
  GenerateContentResult,
} from "./types";

/**
 * MockAiProvider - deterministic templates used for UI development, tests and
 * whenever no AI provider is configured.
 *
 * REAL-GENERATION RULE: output is clearly demo-shaped (templated and prefixed)
 * and never presented as real AI research. As soon as AI_API_KEY or
 * AI_PROVIDER is configured, the factory switches to a real model behind the
 * exact same interface - no application code changes.
 */

function titleCase(text: string): string {
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}

const OUTLINE_TEMPLATES: Array<{ heading: string; subheadings: string[] }> = [
  { heading: "Introduction", subheadings: ["Why this matters", "Who this guide is for"] },
  { heading: "What you need to know", subheadings: ["Key concepts", "Common questions"] },
  { heading: "Best practices", subheadings: ["Getting started", "Avoiding common mistakes"] },
  { heading: "Tools and resources", subheadings: ["Recommended tools", "Further reading"] },
  { heading: "Conclusion", subheadings: ["Key takeaways", "Next steps"] },
];

export class MockAiProvider implements AIProvider {
  readonly name = "mock";
  readonly demo = true;

  async generateContent(input: GenerateContentInput): Promise<GenerateContentResult> {
    const title = input.suggested_title ?? `Complete Guide to ${input.keyword}`;
    const metaTitle = `${title} | Expert Guide`;
    const metaDescription = `Discover everything about ${input.keyword}. Learn best practices, strategies, and tips to improve your SEO performance.`;
    const outline =
      input.outline ??
      `# ${title}\n\n## Introduction\n\n## Why ${input.keyword} Matters\n\n## Best Practices\n\n## Conclusion`;

    return {
      content: outline,
      text: outline,
      meta_title: metaTitle.slice(0, 60),
      meta_description: metaDescription.slice(0, 160),
      provider: "mock",
      token_count: 250,
      model: "mock-model",
    };
  }
  async generateTitle(input: AiTitleInput): Promise<string[]> {
    const k = input.keyword.trim();
    const count = Math.min(Math.max(input.count ?? 3, 1), 10);
    const variants = [
      `${titleCase(k)}: The Complete Guide`,
      `${titleCase(k)} Explained (2026)`,
      `How to Master ${titleCase(k)} in 5 Steps`,
    ];
    return variants.slice(0, count);
  }

  async generateDescription(input: AiDescriptionInput): Promise<string[]> {
    const count = Math.min(Math.max(input.count ?? 2, 1), 5);
    const variants = [
      `Learn everything about ${input.keyword} - practical advice, clear steps and actionable tips to get real results.`,
      `A plain-English guide to ${input.keyword}. No jargon, no fluff - just what works.`,
    ];
    return variants.slice(0, count);
  }

  async generateOutline(input: AiOutlineInput): Promise<AiOutlineSection[]> {
    const sections = Math.min(Math.max(input.sections ?? 5, 3), 10);
    return OUTLINE_TEMPLATES.slice(0, sections).map((s) => ({ ...s, subheadings: [...s.subheadings] }));
  }

  async generateFaq(input: AiFaqInput): Promise<string[]> {
    const t = input.topic.trim();
    const count = Math.min(Math.max(input.count ?? 4, 1), 10);
    const faqs = [
      `What is ${t}?`,
      `How much does ${t} cost?`,
      `How long does ${t} take?`,
      `Is ${t} worth it for small businesses?`,
    ];
    return faqs.slice(0, count);
  }

  async rewrite(input: AiRewriteInput): Promise<string> {
    const tone = input.tone?.trim().toLowerCase();
    const marker = tone ? `[${tone} tone] ` : "[rewritten] ";
    return marker + input.text.trim();
  }

  async expand(input: AiExpandInput): Promise<string> {
    const text = input.text.trim();
    return (
      text +
      "\n\n" +
      "Expanded (demo): consider adding a concrete example, a short case study, and a clear call to action to give this section more depth."
    );
  }

  async shorten(input: AiShortenInput): Promise<string> {
    const target = Math.min(Math.max(input.targetLength ?? 80, 10), 500);
    const text = input.text.trim();
    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 3);
    let result = "";
    for (const sentence of sentences) {
      if (result.length + sentence.length > target) break;
      result += (result ? " " : "") + sentence;
    }
    return result.trim() || text.slice(0, target).trim() + "...";
  }

  async generateBrief(input: AiBriefInput): Promise<AiBriefResult> {
    const k = input.keyword.trim();
    const related = (input.relatedKeywords ?? []).slice(0, 8);
    const outline = await this.generateOutline({ keyword: k, sections: 6 });
    const questions = await this.generateFaq({ topic: k, count: 4 });
    return {
      search_intent: "commercial",
      suggested_title: `${titleCase(k)}: The Complete Guide`,
      outline,
      questions,
      summary: `Demo brief for "${k}"${
        related.length > 0 ? ` targeting related terms like ${related.slice(0, 3).join(", ")}` : ""
      }. Configure AI_API_KEY to generate live briefs.`,
    };
  }
}

