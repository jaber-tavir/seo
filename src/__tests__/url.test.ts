import { describe, expect, it } from "vitest";
import { extractDomain, isLikelyPublicDomain, normalizeWebsiteUrl } from "@/lib/url";

describe("url helpers", () => {
  describe("normalizeWebsiteUrl", () => {
    it("adds https:// when missing", () => {
      expect(normalizeWebsiteUrl("example.com")).toBe("https://example.com/");
    });

    it("keeps http", () => {
      expect(normalizeWebsiteUrl("http://example.com")).toBe("http://example.com/");
    });

    it("strips default ports and hashes", () => {
      expect(normalizeWebsiteUrl("https://example.com:443/page#section")).toBe("https://example.com/page");
      expect(normalizeWebsiteUrl("http://example.com:80/page#section")).toBe("http://example.com/page");
    });

    it("keeps query strings", () => {
      expect(normalizeWebsiteUrl("https://example.com/?a=1")).toBe("https://example.com/?a=1");
    });

    it("trims whitespace", () => {
      expect(normalizeWebsiteUrl("  https://example.com  ")).toBe("https://example.com/");
    });

    it("rejects javascript:, ftp: and other protocols", () => {
      expect(normalizeWebsiteUrl("javascript:alert(1)")).toBeNull();
      expect(normalizeWebsiteUrl("ftp://example.com")).toBeNull();
      expect(normalizeWebsiteUrl("data:text/html,hi")).toBeNull();
    });

    it("rejects empty input", () => {
      expect(normalizeWebsiteUrl("")).toBeNull();
      expect(normalizeWebsiteUrl("   ")).toBeNull();
    });

    it("rejects garbage", () => {
      expect(normalizeWebsiteUrl("not a url at all!!!")).toBeNull();
    });
  });

  describe("extractDomain", () => {
    it("extracts lowercase hostname", () => {
      expect(extractDomain("https://WWW.Example.COM/page")).toBe("www.example.com");
    });

    it("handles bare domains", () => {
      expect(extractDomain("example.com")).toBe("example.com");
    });

    it("returns null for invalid input", () => {
      expect(extractDomain(":::")).toBeNull();
    });
  });

  describe("isLikelyPublicDomain", () => {
    it("accepts normal domains", () => {
      expect(isLikelyPublicDomain("example.com")).toBe(true);
      expect(isLikelyPublicDomain("sub.example.co.uk")).toBe(true);
    });

    it("rejects localhost and internal hosts", () => {
      expect(isLikelyPublicDomain("localhost")).toBe(false);
      expect(isLikelyPublicDomain("api.localhost")).toBe(false);
      expect(isLikelyPublicDomain("server.local")).toBe(false);
      expect(isLikelyPublicDomain("db.internal")).toBe(false);
    });

    it("rejects IP literals", () => {
      expect(isLikelyPublicDomain("192.168.1.1")).toBe(false);
      expect(isLikelyPublicDomain("127.0.0.1")).toBe(false);
    });

    it("rejects hosts without dots", () => {
      expect(isLikelyPublicDomain("intranet")).toBe(false);
    });
  });
});
