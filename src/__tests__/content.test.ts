/**
 * Phase 7 unit tests: deterministic readability analysis and the content/AI
 * validation layer (no database, no network).
 */
import { describe, expect, it } from "vitest";
import { analyzeReadability, countSyllables, splitSentences } from "@/lib/readability";
import {
  AI_TOOLS,
  aiToolRequestSchema,
  contentBriefUpdateSchema,
  createBriefSchema,
  createContentWithProjectSchema,
  readabilitySchema,
} from "@/validators/content";

const SAMPLE =
  "Search engine optimization helps small businesses grow. " +
  "It is not complicated when you follow a clear process. " +
  "Start with technical health, then add content that answers real questions.";

describe("readability analysis", () => {
  it("counts words and sentences and clamps the score", () => {
    const result = analyzeReadability(SAMPLE);
    expect(result.words).toBeGreaterThan(20);
    expect(result.sentences).toBe(3);
    expect(result.fleshReadingEase).toBeGreaterThanOrEqual(0);
    expect(result.fleshReadingEase).toBeLessThanOrEqual(100);
    expect(result.gradeLevel).toBeGreaterThanOrEqual(0);
    expect(result.gradeLevel).toBeLessThanOrEqual(20);
    expect(["very_easy", "easy", "fairly_easy", "standard", "fairly_difficult", "difficult", "very_difficult"]).toContain(
      result.complexity,
    );
  });

  it("is deterministic", () => {
    expect(analyzeReadability(SAMPLE)).toEqual(analyzeReadability(SAMPLE));
  });

  it("returns zeros for empty input instead of NaN", () => {
    const result = analyzeReadability("   ");
    expect(result.words).toBe(0);
    expect(result.sentences).toBe(0);
    expect(result.fleshReadingEase).toBe(0);
    expect(Number.isNaN(result.avgWordsPerSentence)).toBe(false);
  });

  it("splits sentences and counts syllables sanely", () => {
    expect(splitSentences("One. Two! Three?")).toHaveLength(3);
    expect(countSyllables("cat")).toBe(1);
    expect(countSyllables("banana")).toBeGreaterThanOrEqual(3);
    expect(countSyllables("")).toBe(0);
  });
});

describe("content validators", () => {
  it("exposes the full AI tool list", () => {
    expect(AI_TOOLS).toContain("title");
    expect(AI_TOOLS).toContain("brief");
    expect(AI_TOOLS).toContain("content");
  });

  it("accepts a valid payload for every AI tool", () => {
    const payloads = [
      { tool: "title", keyword: "airport transfer lisbon" },
      { tool: "description", keyword: "airport transfer lisbon" },
      { tool: "outline", keyword: "airport transfer lisbon" },
      { tool: "faq", topic: "airport transfer lisbon" },
      { tool: "rewrite", text: "Some text to rewrite." },
      { tool: "expand", text: "Some text to expand." },
      { tool: "shorten", text: "Some text to shorten." },
      { tool: "brief", keyword: "airport transfer lisbon" },
      { tool: "content", keyword: "airport transfer lisbon" },
    ];

    for (const payload of payloads) {
      const parsed = aiToolRequestSchema.safeParse(payload);
      expect(parsed.success, `expected ${payload.tool} to validate`).toBe(true);
    }
  });

  it("rejects unknown tools and empty input", () => {
    expect(aiToolRequestSchema.safeParse({ tool: "hack", keyword: "seo" }).success).toBe(false);
    expect(aiToolRequestSchema.safeParse({ tool: "title", keyword: "" }).success).toBe(false);
    expect(aiToolRequestSchema.safeParse({ tool: "rewrite", text: "" }).success).toBe(false);
  });

  it("supports rich brief creation while ignoring unknown fields", () => {
    const parsed = createBriefSchema.safeParse({
      keyword: "content gap analysis",
      suggested_title: "Content gap analysis",
      outline: "Intro\nBenefits\nHow to",
      related_keywords: ["content gap", "keyword gap"],
      questions: ["What is a content gap?"],
      not_a_field: "ignored",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.outline).toContain("Intro");
    expect(parsed.data.related_keywords).toHaveLength(2);
    expect("not_a_field" in parsed.data).toBe(false);
  });

  it("requires a project id when creating a document", () => {
    expect(createContentWithProjectSchema.safeParse({ title: "Draft" }).success).toBe(false);
    expect(
      createContentWithProjectSchema.safeParse({
        project_id: "11111111-1111-4111-8111-111111111111",
        title: "Draft",
      }).success,
    ).toBe(true);
  });

  it("accepts partial brief updates and rejects empty text fields", () => {
    expect(contentBriefUpdateSchema.safeParse({ suggested_title: "New title" }).success).toBe(true);
    expect(contentBriefUpdateSchema.safeParse({ keyword: "" }).success).toBe(false);
  });

  it("validates readability input length", () => {
    expect(readabilitySchema.safeParse({ text: "hi" }).success).toBe(false);
    expect(readabilitySchema.safeParse({ text: SAMPLE }).success).toBe(true);
  });
});