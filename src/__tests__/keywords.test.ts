import { describe, expect, it } from "vitest";
import { averagePosition, bestPosition, bucketCounts, bucketPosition, positionChange, visibilityScore } from "@/lib/ranking-math";
import { attachClusters, clusterKeywords } from "@/lib/keyword-clustering";

describe("positionChange", () => {
  it("positive means improved", () => {
    expect(positionChange(3, 7)).toBe(4);
    expect(positionChange(7, 3)).toBe(-4);
    expect(positionChange(5, 5)).toBe(0);
  });

  it("handles entering/leaving the index", () => {
    expect(positionChange(8, null)).toBe(8);
    expect(positionChange(null, 8)).toBe(-8);
    expect(positionChange(null, null)).toBe(0);
  });
});

describe("average/best/visibility", () => {
  const history = [
    { position: 1, checked_at: "2026-01-01" },
    { position: 3, checked_at: "2026-01-02" },
    { position: null, checked_at: "2026-01-03" },
  ];

  it("averages only found positions", () => {
    expect(averagePosition(history)).toBe(2);
    expect(averagePosition([{ position: null, checked_at: "x" }])).toBeNull();
  });

  it("finds best position", () => {
    expect(bestPosition(history)).toBe(1);
    expect(bestPosition([{ position: null, checked_at: "x" }])).toBeNull();
  });

  it("scores visibility highest at position 1", () => {
    expect(visibilityScore([{ position: 1, checked_at: "x" }])).toBe(100);
    expect(visibilityScore([{ position: 2, checked_at: "x" }])).toBe(50);
    expect(visibilityScore([])).toBe(0);
  });
});

describe("position buckets", () => {
  it("buckets single positions", () => {
    expect(bucketPosition(1)).toBe("top3");
    expect(bucketPosition(3)).toBe("top3");
    expect(bucketPosition(7)).toBe("top10");
    expect(bucketPosition(15)).toBe("top20");
    expect(bucketPosition(80)).toBe("top100");
    expect(bucketPosition(null)).toBe("notRanked");
  });

  it("counts a batch of positions", () => {
    expect(bucketCounts([1, 2, 5, 12, 90, null])).toEqual({
      top3: 2, top10: 1, top20: 1, top100: 1, notRanked: 1,
    });
  });
});

describe("keyword clustering", () => {
  it("groups a Lisbon airport-transfer cluster", () => {
    const clusters = clusterKeywords([
      "airport transfer Lisbon",
      "Lisbon airport transfer",
      "Lisbon airport taxi",
      "airport transfer Lisbon price",
      "Lisbon airport private transfer",
      "Lisbon airport shuttle",
      "best pizza Chicago",
    ]);
    const airport = clusters.find((c) => c.members.includes("airport transfer Lisbon"));
    expect(airport).toBeDefined();
    expect(airport!.members.length).toBeGreaterThanOrEqual(5);
    expect(airport!.primary).toContain("Lisbon");
    const pizza = clusters.find((c) => c.members.includes("best pizza Chicago"));
    expect(pizza!.members).toHaveLength(1);
  });

  it("dedupes and ignores empties", () => {
    const clusters = clusterKeywords(["seo audit", "seo audit", "  ", "seo audit tool"]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.members).toHaveLength(2);
  });

  it("attaches cluster labels only to multi-member clusters", () => {
    const rows = [{ keyword: "seo audit" }, { keyword: "seo audit tool" }, { keyword: "pizza" }];
    const clusters = clusterKeywords(rows.map((r) => r.keyword));
    const attached = attachClusters(rows, clusters);
    expect(attached.find((r) => r.keyword === "pizza")!.cluster).toBeNull();
    expect(attached.find((r) => r.keyword === "seo audit")!.cluster).not.toBeNull();
  });
});
