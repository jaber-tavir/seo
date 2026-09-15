import { describe, expect, it } from "vitest";
import { isUnlimited, isWithinLimit, remainingUsage, resolveCurrentPeriod, usagePercent } from "@/lib/usage-math";

describe("usage-math", () => {
  describe("resolveCurrentPeriod", () => {
    it("returns UTC month boundaries", () => {
      const { period_start, period_end } = resolveCurrentPeriod(new Date(Date.UTC(2026, 2, 15, 12, 30)));
      expect(period_start.toISOString()).toBe("2026-03-01T00:00:00.000Z");
      expect(period_end.toISOString()).toBe("2026-03-31T23:59:59.999Z");
    });

    it("handles January (previous year December end)", () => {
      const { period_start, period_end } = resolveCurrentPeriod(new Date(Date.UTC(2026, 0, 10)));
      expect(period_start.getUTCFullYear()).toBe(2026);
      expect(period_start.getUTCMonth()).toBe(0);
      expect(period_end.getUTCMonth()).toBe(0);
    });
  });

  describe("isWithinLimit", () => {
    it("allows unlimited plans", () => {
      expect(isWithinLimit(-1, 999999, 100)).toBe(true);
    });

    it("blocks when the limit is reached", () => {
      expect(isWithinLimit(5, 5, 1)).toBe(false);
      expect(isWithinLimit(5, 4, 1)).toBe(true);
    });

    it("blocks zero limits (metric disabled)", () => {
      expect(isWithinLimit(0, 0, 1)).toBe(false);
    });

    it("allows zero-request checks against used value", () => {
      expect(isWithinLimit(5, 7, 0)).toBe(false);
    });
  });

  describe("remainingUsage", () => {
    it("returns null for unlimited", () => {
      expect(remainingUsage(-1, 10)).toBeNull();
    });

    it("never returns negative values", () => {
      expect(remainingUsage(10, 15)).toBe(0);
      expect(remainingUsage(10, 3)).toBe(7);
    });
  });

  describe("usagePercent", () => {
    it("returns null for unlimited", () => {
      expect(usagePercent(-1, 10)).toBeNull();
    });

    it("caps at 100", () => {
      expect(usagePercent(10, 20)).toBe(100);
    });

    it("handles zero limits", () => {
      expect(usagePercent(0, 0)).toBe(0);
      expect(usagePercent(0, 5)).toBe(100);
    });

    it("rounds", () => {
      expect(usagePercent(3, 1)).toBe(33);
    });
  });

  describe("isUnlimited", () => {
    it("uses -1 as the unlimited sentinel", () => {
      expect(isUnlimited(-1)).toBe(true);
      expect(isUnlimited(0)).toBe(false);
      expect(isUnlimited(100)).toBe(false);
    });
  });
});
