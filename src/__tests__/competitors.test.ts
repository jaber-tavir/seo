import { describe, expect, it } from "vitest";
import { MockKeywordProvider } from "@/providers/keyword/mock-provider";

describe("competitor domain keywords (mock)", () => {
  const provider = new MockKeywordProvider();

  it("returns deterministic domain keywords with positions and urls", async () => {
    const result = await provider.getDomainKeywords("Example.COM", { country: "us", language: "en", limit: 3 });
    expect(result.domain).toBe("example.com");
    expect(result.keywords).toHaveLength(3);
    expect(result.keywords[0]?.keyword).toContain("example.com");
    expect(result.keywords[0]?.position).toBe(1);
    expect(result.keywords[0]?.url).toContain("https://example.com/");
  });

  it("never fabricates volumes (0 or null only)", async () => {
    const result = await provider.getDomainKeywords("example.com", { limit: 5 });
    for (const k of result.keywords) {
      expect(k.search_volume === 0 || k.search_volume === null).toBe(true);
      expect(k.difficulty).toBeNull();
      expect(k.cpc).toBeNull();
    }
  });

  it("respects the limit", async () => {
    const result = await provider.getDomainKeywords("example.com", { limit: 2 });
    expect(result.keywords).toHaveLength(2);
    expect(result.total).toBe(2);
  });
});
