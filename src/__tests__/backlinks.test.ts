import { describe, expect, it } from "vitest";
import { MockBacklinkProvider } from "@/providers/backlink/mock-provider";

describe("backlink mock provider", () => {
  const provider = new MockBacklinkProvider();

  it("returns deterministic demo rows with statuses", async () => {
    const all = await provider.getBacklinks("Example.COM", { status: "all" });
    expect(all.is_demo).toBe(true);
    expect(all.total).toBe(3);
    expect(all.backlinks.every((b) => !b.is_lost)).toBe(true);
    expect(all.backlinks[0]?.target_url).toContain("example.com");

    const lost = await provider.getBacklinks("example.com", { status: "lost" });
    expect(lost.total).toBe(1);
    expect(lost.backlinks[0]?.is_lost).toBe(true);

    const fresh = await provider.getBacklinks("example.com", { status: "new" });
    expect(fresh.total).toBe(1);
    expect(fresh.backlinks[0]?.is_new).toBe(true);
  });

  it("never fabricates authority scores", async () => {
    const res = await provider.getBacklinks("example.com", { status: "all" });
    for (const b of res.backlinks) {
      expect(b.domain_authority).toBeNull();
    }
  });

  it("filters by link type and paginates", async () => {
    const nofollow = await provider.getBacklinks("example.com", { status: "all", linkType: "nofollow" });
    expect(nofollow.backlinks.every((b) => b.link_type === "nofollow")).toBe(true);
    const paged = await provider.getBacklinks("example.com", { status: "all", limit: 1, offset: 1 });
    expect(paged.backlinks).toHaveLength(1);
    expect(paged.total).toBe(3);
  });

  it("summarizes counts", async () => {
    const summary = await provider.getSummary("example.com");
    expect(summary.total).toBe(3);
    expect(summary.referring_domains).toBe(3);
    expect(summary.dofollow + summary.nofollow).toBe(summary.total);
    expect(summary.is_demo).toBe(true);
  });
});
