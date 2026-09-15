export interface ContentProvider {
  generateContent(input: GenerateContentInput): Promise<GenerateContentResult>
}

export interface GenerateContentInput {
  keyword: string
  search_intent?: string | null
  suggested_title?: string | null
  outline?: string | null
  competitor_urls?: string[] | null
  related_keywords?: string[] | null
  questions?: string[] | null
  tone?: string
  language?: string
  guidelines?: string
}

export interface GenerateContentResult {
  content?: string | null
  text?: string | null
  meta_title?: string | null
  meta_description?: string | null
  provider?: string
  token_count?: number | null
  model?: string | null
}

/**
 * AIProvider abstraction (Phase 7).
 * The UI and services never call AI APIs directly - they go through this
 * interface so providers (OpenAI-compatible, Anthropic, Gemini, local LLMs)
 * can be swapped without touching application code.
 *
 * REAL GENERATION RULE: providers return generated text from their source.
 * The mock provider (used when no AI_API_KEY is configured) returns
 * clearly-templated demo output - never real-sounding fabricated marketing.
 */

export interface AiTitleInput {
  keyword: string;
  tone?: string;
  count?: number;
}

export interface AiDescriptionInput {
  keyword: string;
  target?: string;
  count?: number;
}

export interface AiOutlineSection {
  heading: string;
  subheadings?: string[];
}

export interface AiOutlineInput {
  keyword: string;
  intent?: string;
  sections?: number;
}

export interface AiFaqInput {
  topic: string;
  count?: number;
}

export interface AiRewriteInput {
  text: string;
  tone?: string;
}

export interface AiExpandInput {
  text: string;
}

export interface AiShortenInput {
  text: string;
  targetLength?: number;
}

export interface AiBriefInput {
  keyword: string;
  relatedKeywords?: string[];
  competitorUrls?: string[];
  country?: string;
  language?: string;
}

export interface AiBriefResult {
  search_intent: "informational" | "commercial" | "transactional" | "navigational";
  suggested_title: string;
  outline: AiOutlineSection[];
  questions: string[];
  summary: string;
}

/**
 * Full AI provider contract.
 * Extends the content-generation capability, so a single provider instance
 * serves both full-article generation and the individual SEO content tools
 * (titles, descriptions, outlines, FAQs, rewriting, briefs).
 */
export interface AIProvider extends ContentProvider {
  readonly name: string;
  /** true when the mock (demo) provider is active */
  readonly demo: boolean;

  generateTitle(input: AiTitleInput): Promise<string[]>;
  generateDescription(input: AiDescriptionInput): Promise<string[]>;
  generateOutline(input: AiOutlineInput): Promise<AiOutlineSection[]>;
  generateFaq(input: AiFaqInput): Promise<string[]>;
  rewrite(input: AiRewriteInput): Promise<string>;
  expand(input: AiExpandInput): Promise<string>;
  shorten(input: AiShortenInput): Promise<string>;
  generateBrief(input: AiBriefInput): Promise<AiBriefResult>;
}