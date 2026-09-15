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

interface OpenAiProviderOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

const SYSTEM_CONTENT =
  "You are an expert SEO content writer. Generate well-structured, SEO-optimized content based on the provided brief. Return a JSON object with 'content' (the full article in markdown), 'meta_title' (max 60 chars) and 'meta_description' (max 160 chars).";

/**
 * OpenAI (and any OpenAI-compatible) AI provider.
 *
 * Every method performs a real API call - nothing is fabricated. When the API
 * is unreachable or returns an unusable payload the call throws so callers can
 * surface a safe error instead of displaying invented content.
 */
export class OpenAiProvider implements AIProvider {
  readonly name = "openai";
  readonly demo = false;

  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(options: OpenAiProviderOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://api.openai.com/v1";
    this.model = options.model ?? "gpt-4o-mini";
  }

  // --------------------------------------------------------------- transport

  private async chat(messages: ChatMessage[], temperature = 0.7): Promise<{ text: string; tokens: number | null }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ model: this.model, messages, temperature }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { total_tokens?: number };
      };

      return {
        text: data.choices?.[0]?.message?.content ?? "",
        tokens: data.usage?.total_tokens ?? null,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Request JSON and parse defensively (models often wrap it in prose/fences). */
  private async chatJson<T>(
    messages: ChatMessage[],
    temperature = 0.4,
  ): Promise<{ value: T | null; text: string; tokens: number | null }> {
    const { text, tokens } = await this.chat(messages, temperature);
    const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

    try {
      return { value: JSON.parse(cleaned) as T, text, tokens };
    } catch {
      const start = cleaned.search(/[[{]/);
      const end = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
      if (start >= 0 && end > start) {
        try {
          return { value: JSON.parse(cleaned.slice(start, end + 1)) as T, text, tokens };
        } catch {
          /* fall through to null */
        }
      }
      return { value: null, text, tokens };
    }
  }

  // --------------------------------------------------------------- generation

  async generateContent(input: GenerateContentInput): Promise<GenerateContentResult> {
    const { value, text, tokens } = await this.chatJson<{
      content?: string;
      meta_title?: string;
      meta_description?: string;
    }>([
      { role: "system", content: SYSTEM_CONTENT },
      { role: "user", content: this.buildPrompt(input) },
    ]);

    const article = value?.content ?? text;

    return {
      content: article,
      text: article,
      meta_title: value?.meta_title ?? null,
      meta_description: value?.meta_description ?? null,
      provider: "openai",
      token_count: tokens,
      model: this.model,
    };
  }
async generateTitle(input: AiTitleInput): Promise<string[]> {
    const count = Math.min(Math.max(input.count ?? 3, 1), 10);
    const { value, text } = await this.chatJson<string[]>([
      {
        role: "system",
        content: `You are an expert SEO copywriter. Return a JSON array of exactly ${count} SEO title tags (max 60 characters each, no emojis).`,
      },
      {
        role: "user",
        content: `Target keyword: ${input.keyword}${input.tone ? `\nTone: ${input.tone}` : ""}`,
      },
    ]);

    if (Array.isArray(value) && value.length > 0) return value.slice(0, count);
    return text
      .split("\n")
      .map((line) => line.replace(/^[-*\d.\s"']+/, "").replace(/["']$/, "").trim())
      .filter(Boolean)
      .slice(0, count);
  }

  async generateDescription(input: AiDescriptionInput): Promise<string[]> {
    const count = Math.min(Math.max(input.count ?? 2, 1), 5);
    const { value, text } = await this.chatJson<string[]>([
      {
        role: "system",
        content: `You are an expert SEO copywriter. Return a JSON array of exactly ${count} meta descriptions (max 160 characters each, with a call to action).`,
      },
      {
        role: "user",
        content: `Target keyword: ${input.keyword}${input.target ? `\nTarget URL: ${input.target}` : ""}`,
      },
    ]);

    if (Array.isArray(value) && value.length > 0) return value.slice(0, count);
    return text
      .split("\n")
      .map((line) => line.replace(/^[-*\d.\s"']+/, "").replace(/["']$/, "").trim())
      .filter(Boolean)
      .slice(0, count);
  }

  async generateOutline(input: AiOutlineInput): Promise<AiOutlineSection[]> {
    const sections = Math.min(Math.max(input.sections ?? 5, 3), 10);
    const { value } = await this.chatJson<AiOutlineSection[]>([
      {
        role: "system",
        content:
          'You are an SEO content strategist. Return a JSON array of section objects: [{"heading": string, "subheadings": string[]}].',
      },
      {
        role: "user",
        content: `Create a ${sections}-section article outline for the keyword "${input.keyword}"${
          input.intent ? ` (search intent: ${input.intent})` : ""
        }.`,
      },
    ]);

    if (Array.isArray(value) && value.length > 0) {
      return value
        .filter((section) => section && typeof section.heading === "string")
        .map((section) => ({
          heading: section.heading,
          subheadings: Array.isArray(section.subheadings)
            ? section.subheadings.filter((s) => typeof s === "string")
            : [],
        }))
        .slice(0, sections);
    }

    throw new Error("AI provider returned an unusable outline");
  }

  async generateFaq(input: AiFaqInput): Promise<string[]> {
    const count = Math.min(Math.max(input.count ?? 4, 1), 10);
    const { value } = await this.chatJson<string[]>([
      {
        role: "system",
        content: `You are an SEO content strategist. Return a JSON array of exactly ${count} frequently asked questions (questions only) about the topic.`,
      },
      { role: "user", content: `Topic: ${input.topic}` },
    ]);

    if (Array.isArray(value) && value.length > 0) {
      return value.filter((q) => typeof q === "string").slice(0, count);
    }
    throw new Error("AI provider returned an unusable FAQ list");
  }

  async rewrite(input: AiRewriteInput): Promise<string> {
    const { text } = await this.chat([
      {
        role: "system",
        content:
          "You are an expert editor. Rewrite the user's text preserving its meaning and facts. Return only the rewritten text.",
      },
      { role: "user", content: `${input.tone ? `Tone: ${input.tone}\n\n` : ""}${input.text}` },
    ]);
    return text.trim();
  }

  async expand(input: AiExpandInput): Promise<string> {
    const { text } = await this.chat([
      {
        role: "system",
        content:
          "You are an expert SEO writer. Expand the user's text with useful detail, examples and specifics while keeping the original facts. Return only the expanded text.",
      },
      { role: "user", content: input.text },
    ]);
    return text.trim();
  }

  async shorten(input: AiShortenInput): Promise<string> {
    const target = Math.min(Math.max(input.targetLength ?? 80, 10), 500);
    const { text } = await this.chat([
      {
        role: "system",
        content: `You are an expert editor. Shorten the user's text to about ${target} words while keeping the most important information. Return only the shortened text.`,
      },
      { role: "user", content: input.text },
    ]);
    return text.trim();
  }

  async generateBrief(input: AiBriefInput): Promise<AiBriefResult> {
    const { value } = await this.chatJson<AiBriefResult>([
      {
        role: "system",
        content:
          'You are an SEO content strategist. Return a JSON object: {"search_intent": "informational"|"commercial"|"transactional"|"navigational", "suggested_title": string, "outline": [{"heading": string, "subheadings": string[]}], "questions": string[], "summary": string}.',
      },
      {
        role: "user",
        content: [
          `Primary keyword: ${input.keyword}`,
          input.relatedKeywords?.length ? `Related keywords: ${input.relatedKeywords.join(", ")}` : "",
          input.competitorUrls?.length ? `Competing URLs: ${input.competitorUrls.join(", ")}` : "",
          input.country ? `Country: ${input.country}` : "",
          input.language ? `Language: ${input.language}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ]);

    if (!value || typeof value.suggested_title !== "string") {
      throw new Error("AI provider returned an unusable content brief");
    }

    const intents: AiBriefResult["search_intent"][] = [
      "informational",
      "commercial",
      "transactional",
      "navigational",
    ];

    return {
      search_intent: intents.includes(value.search_intent) ? value.search_intent : "informational",
      suggested_title: value.suggested_title,
      outline: Array.isArray(value.outline) ? value.outline : [],
      questions: Array.isArray(value.questions) ? value.questions.filter((q) => typeof q === "string") : [],
      summary: typeof value.summary === "string" ? value.summary : "",
    };
  }

  // ---------------------------------------------------------------- prompts

  private buildPrompt(input: GenerateContentInput): string {
    const parts = [`Keyword: ${input.keyword}`];
    if (input.search_intent) parts.push(`Search Intent: ${input.search_intent}`);
    if (input.suggested_title) parts.push(`Suggested Title: ${input.suggested_title}`);
    if (input.outline) parts.push(`Outline:\n${input.outline}`);
    if (input.related_keywords?.length) parts.push(`Related Keywords: ${input.related_keywords.join(", ")}`);
    if (input.questions?.length) parts.push(`Questions to Answer:\n${input.questions.join("\n")}`);
    if (input.tone) parts.push(`Tone: ${input.tone}`);
    if (input.language) parts.push(`Language: ${input.language}`);
    if (input.guidelines) parts.push(`Guidelines: ${input.guidelines}`);
    return parts.join("\n\n");
  }
}
