/**
 * AI provider abstraction tests.
 *
 * The UI and services must only ever talk to a provider through the AIProvider
 * interface - these tests pin that contract and the demo-flagging behaviour.
 */
import { describe, expect, it } from "vitest";
import { MockAiProvider, OpenAiProvider, getAiProvider, isAiEnabled, resetAiProvider } from "@/providers/ai";

const AI_METHODS = [
  "generateContent",
  "generateTitle",
  "generateDescription",
  "generateOutline",
  "generateFaq",
  "rewrite",
  "expand",
  "shorten",
  "generateBrief",
] as const;

describe("AI provider contract", () => {
  it("mock provider implements every AIProvider method", () => {
    const provider = new MockAiProvider();
    expect(provider.name).toBe("mock");
    expect(provider.demo).toBe(true);
    for (const method of AI_METHODS) {
      expect(typeof provider[method]).toBe("function");
    }
  });

  it("OpenAI provider declares itself as non-demo and constructs without network access", () => {
    const provider = new OpenAiProvider({ apiKey: "test-key", baseUrl: "https://example.invalid/v1" });
    expect(provider.name).toBe("openai");
    expect(provider.demo).toBe(false);
    for (const method of AI_METHODS) {
      expect(typeof provider[method]).toBe("function");
    }
  });

  it("factory returns a handle with a consistent demo flag", () => {
    resetAiProvider();
    const handle = getAiProvider();
    expect(["mock", "openai"]).toContain(handle.name);
    expect(handle.demo).toBe(handle.name === "mock");
    expect(isAiEnabled()).toBe(!handle.demo);
  });
});

describe("MockAiProvider output", () => {
  const provider = new MockAiProvider();

  it("is deterministic for identical input", async () => {
    const first = await provider.generateTitle({ keyword: "airport transfer lisbon", count: 2 });
    const second = await provider.generateTitle({ keyword: "airport transfer lisbon", count: 2 });
    expect(first).toEqual(second);
    expect(first).toHaveLength(2);
    expect(first[0]).toContain("Airport Transfer Lisbon");
  });

  it("clamps requested sizes to the available/bounded templates", async () => {
    expect(await provider.generateTitle({ keyword: "seo", count: 99 })).toHaveLength(3);
    expect((await provider.generateOutline({ keyword: "seo", sections: 99 })).length).toBeLessThanOrEqual(10);
    expect((await provider.generateFaq({ topic: "seo", count: 99 })).length).toBeLessThanOrEqual(10);
  });

  it("returns demo article content with meta fields", async () => {
    const result = await provider.generateContent({ keyword: "local seo" });
    expect(result.provider).toBe("mock");
    expect(result.content ?? result.text).toBeTruthy();
    expect((result.meta_title ?? "").length).toBeLessThanOrEqual(60);
    expect((result.meta_description ?? "").length).toBeLessThanOrEqual(160);
  });

  it("prefers a supplied outline over the template", async () => {
    const result = await provider.generateContent({ keyword: "seo", outline: "# Custom outline" });
    expect(result.content).toContain("Custom outline");
  });

  it("marks transformed text as demo output", async () => {
    expect(await provider.rewrite({ text: "Hello world.", tone: "Friendly" })).toContain("[friendly tone]");
    expect(await provider.expand({ text: "Hello world." })).toContain("Expanded (demo)");
    const shortened = await provider.shorten({ text: "One. Two. Three. Four.", targetLength: 8 });
    expect(shortened.length).toBeLessThanOrEqual(12);
  });

  it("builds a brief with intent, outline and questions", async () => {
    const brief = await provider.generateBrief({ keyword: "keyword cannibalization" });
    expect(brief.search_intent).toBe("commercial");
    expect(brief.suggested_title).toContain("Keyword Cannibalization");
    expect(brief.outline.length).toBeGreaterThan(0);
    expect(brief.questions.length).toBeGreaterThan(0);
    expect(brief.summary).toContain("Demo brief");
  });
});