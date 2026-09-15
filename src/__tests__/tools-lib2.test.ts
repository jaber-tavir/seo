import { describe, expect, it } from "vitest";
import { checkSerpInput, displayUrl, estimatePixels, validateSerp } from "@/lib/tools/serp";
import { SCHEMA_TYPES, buildJsonLd, getSchemaDefinition, validateSchema } from "@/lib/tools/schema";
import { analyzeKeywordDensity } from "@/lib/tools/keyword-density";

describe("serp estimation", () => {
  it("estimates zero pixels for empty string", () => {
    expect(estimatePixels("", "desktopTitle")).toBe(0);
  });

  it("counts capitals and wide letters heavier than narrow ones", () => {
    const narrow = estimatePixels("iiii", "desktopTitle");
    const caps = estimatePixels("WWWW", "desktopTitle");
    expect(caps).toBeGreaterThan(narrow);
  });

  it("flags over-long titles as error on desktop", () => {
    const checks = checkSerpInput("title", "W".repeat(70), "desktop");
    expect(checks.some((c) => c.level === "error")).toBe(true);
  });

  it("flags short titles as warning but not error", () => {
    const checks = checkSerpInput("title", "Hi", "desktop");
    expect(checks.some((c) => c.level === "error")).toBe(false);
    expect(checks.some((c) => c.level === "warning")).toBe(true);
  });

  it("accepts a well-formed title/description pair", () => {
    const title = "Best Running Shoes for Marathons - Buyer Guide 2025";
    const description = "Compare the top marathon running shoes of 2025 with expert analysis on cushioning, durability and price. Updated weekly.";
    const v = validateSerp(title, description, "desktop");
    expect(v.titleChecks.some((c) => c.level === "error")).toBe(false);
    expect(v.descriptionChecks.some((c) => c.level === "error")).toBe(false);
    expect(v.descriptionChecks.some((c) => c.level === "ok")).toBe(true);
  });

  it("flags over-long descriptions as error and short ones as warning", () => {
    expect(checkSerpInput("description", "d".repeat(200), "desktop").some((c) => c.level === "error")).toBe(true);
    expect(checkSerpInput("description", "short", "desktop").some((c) => c.level === "warning")).toBe(true);
    expect(checkSerpInput("description", "", "desktop").some((c) => c.level === "error")).toBe(true);
  });

  it("desktop truncates long titles that mobile still fits", () => {
    const longTitle = "Amazing Super Calibrated Widget Systems For Modern Industrial Automation Workflows";
    const desktop = checkSerpInput("title", longTitle, "desktop");
    const mobile = checkSerpInput("title", longTitle, "mobile");
    expect(estimatePixels(longTitle, "mobileTitle")).toBeGreaterThan(estimatePixels(longTitle, "desktopTitle"));
    expect(desktop.some((c) => c.level === "error")).toBe(true);
    expect(mobile.some((c) => c.level === "error")).toBe(false);
  });

  it("builds google-style display urls", () => {
    const d = displayUrl("https://www.example.com/best-running-shoes/reviews");
    expect(d.origin).toBe("example.com");
    expect(d.segments).toEqual(["best running shoes", "reviews"]);
  });
});

describe("schema generator", () => {
  it("covers all 13 required types", () => {
    expect([...SCHEMA_TYPES].sort()).toEqual(
      ["Article", "Breadcrumb", "Course", "Event", "FAQ", "LocalBusiness", "Organization", "Person", "Product", "Recipe", "Review", "Service", "WebSite"].sort()
    );
    for (const type of SCHEMA_TYPES) {
      expect(getSchemaDefinition(type).fields.length).toBeGreaterThan(0);
    }
  });

  it("validates required fields", () => {
    const res = validateSchema("Article", {});
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.includes("Headline"))).toBe(true);
    expect(res.json).toBe("");
  });

  it("builds parseable JSON-LD with @context", () => {
    const json = buildJsonLd("Article", {
      headline: "Test headline",
      image: "https://example.com/img.jpg",
      authorName: "Jane Doe",
      datePublished: "2025-01-01",
      publisherName: "Example Media",
      publisherLogo: "https://example.com/logo.png",
      description: "",
      dateModified: "",
    });
    const parsed = JSON.parse(json);
    expect(parsed["@context"]).toBe("https://schema.org");
    expect(parsed["@type"]).toBe("Article");
    expect(parsed.author.name).toBe("Jane Doe");
    expect(parsed.publisher.logo["@type"]).toBe("ImageObject");
  });

  it("builds FAQ with only complete question/answer pairs", () => {
    const json = buildJsonLd("FAQ", {
      question1: "Q1?",
      answer1: "A1",
      question2: "Q2?",
      answer2: "",
      question3: "",
      answer3: "A3",
    });
    const parsed = JSON.parse(json);
    expect(parsed.mainEntity).toHaveLength(1);
    expect(parsed.mainEntity[0].name).toBe("Q1?");
  });

  it("validates a full product schema", () => {
    const res = validateSchema("Product", {
      name: "Widget",
      image: "https://example.com/w.jpg",
      description: "A widget",
      sku: "W-1",
      brand: "Acme",
      price: "19.99",
      priceCurrency: "USD",
      ratingValue: "4.5",
      ratingCount: "12",
      availability: "InStock",
    });
    expect(res.ok).toBe(true);
    const parsed = JSON.parse(res.json);
    expect(parsed.offers.price).toBe("19.99");
    expect(parsed.aggregateRating.ratingValue).toBe("4.5");
    expect(parsed.offers.availability).toBe("https://schema.org/InStock");
  });

  it("parses breadcrumb trails", () => {
    const json = buildJsonLd("Breadcrumb", {
      trail: "1|Home|https://example.com\n2|Blog|https://example.com/blog\n3|Post|https://example.com/blog/post",
    });
    const parsed = JSON.parse(json);
    expect(parsed.itemListElement).toHaveLength(3);
    expect(parsed.itemListElement[1]).toEqual({
      "@type": "ListItem",
      position: 2,
      name: "Blog",
      item: "https://example.com/blog",
    });
  });

  it("builds website search action", () => {
    const parsed = JSON.parse(
      buildJsonLd("WebSite", { name: "Example", url: "https://example.com", searchUrl: "https://example.com/search?q={search_term_string}" })
    );
    expect(parsed.potentialAction["@type"]).toBe("SearchAction");
    expect(parsed.potentialAction["query-input"]).toBe("required name=search_term_string");
  });
});


describe("keyword density analyzer", () => {
  const sample = `
    <h1>Lisbon airport transfer</h1>
    <p>Booking a Lisbon airport transfer is simple. Our airport transfer service runs 24/7.
    The Lisbon airport transfer price includes meet and greet. Airport transfer Lisbon bookings
    can be changed free of charge. A private transfer Lisbon vehicle awaits you.</p>
    <p>Private transfer Lisbon cars are sedans or vans. Lisbon airport taxi ranks are cheaper,
    but a prebooked airport transfer is more reliable than a taxi.</p>
  `;

  it("counts words and sentences", () => {
    const res = analyzeKeywordDensity(sample);
    expect(res.totalWords).toBeGreaterThan(40);
    expect(res.sentences).toBeGreaterThanOrEqual(6);
    expect(res.avgWordsPerSentence).toBeGreaterThan(3);
  });

  it("strips html tags before analysis", () => {
    const res = analyzeKeywordDensity("<p><strong>coffee</strong> and <em>coffee</em> and coffee cups</p>");
    expect(res.totalWords).toBe(6);
    expect(res.single.some((s) => s.phrase === "coffee")).toBe(true);
  });

  it("extracts single, 2-word and 3-word phrases", () => {
    const res = analyzeKeywordDensity(sample);
    expect(res.single.some((s) => s.phrase.includes("airport"))).toBe(true);
    expect(res.twoWord.some((s) => s.phrase.includes("airport"))).toBe(true);
    expect(res.threeWord.length).toBeGreaterThan(0);
  });

  it("computes density percentages", () => {
    const res = analyzeKeywordDensity("coffee coffee coffee tea tea water");
    const coffee = res.single.find((s) => s.phrase === "coffee");
    const tea = res.single.find((s) => s.phrase === "tea");
    expect(coffee).toBeDefined();
    expect(coffee!.count).toBe(3);
    expect(coffee!.density).toBeGreaterThan(tea!.density);
  });

  it("flags over-optimisation above 3 percent", () => {
    const res = analyzeKeywordDensity("widget ".repeat(30) + "other words here now fine");
    expect(res.overOptimised.some((s) => s.phrase === "widget")).toBe(true);
  });

  it("ignores stop-word-only n-grams", () => {
    const res = analyzeKeywordDensity("the of and to the of and to the of and to");
    expect(res.single).toHaveLength(0);
    expect(res.twoWord).toHaveLength(0);
  });

  it("handles empty input", () => {
    const res = analyzeKeywordDensity("");
    expect(res.totalWords).toBe(0);
    expect(res.sentences).toBe(0);
    expect(res.single).toHaveLength(0);
  });
});

