/**
 * Content & AI integration tests.
 *
 * Proves the Phase 7 security/plan rules:
 * - one organization can never read or mutate another organization's briefs
 *   or content documents (404 masking, not 403)
 * - AI usage is metered through the centralized UsageService (DB-driven plan
 *   limits) and demo output is always flagged
 *
 * Requirements: MySQL reachable with DATABASE_* env vars, migrations applied
 * (`npm run migrate`) and plans seeded (`npm run db:seed`).
 * The suite skips itself when the database is unavailable.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sequelize } from "@/config/database";
import { authService } from "@/services/AuthService";
import { contentService } from "@/services/ContentService";
import { organizationService } from "@/services/OrganizationService";
import { usageService } from "@/services/UsageService";
import { projectService } from "@/services/ProjectService";
import { planRepository } from "@/repositories/PlanRepository";
import { userRepository } from "@/repositories/UserRepository";

let dbAvailable = false;
const stamp = Date.now();

const userA = { first_name: "ContentA", email: `content-a-${stamp}@test.local`, password: "Password123" };
const userB = { first_name: "ContentB", email: `content-b-${stamp}@test.local`, password: "Password123" };

beforeAll(async () => {
  try {
    await sequelize.authenticate();
    const freePlan = await planRepository.findBySlug("free");
    if (!freePlan) throw new Error("free plan missing");
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
});

afterAll(async () => {
  if (!dbAvailable) return;
  try {
    for (const email of [userA.email, userB.email]) {
      const user = await userRepository.findByEmail(email);
      if (user) await userRepository.delete(user.id);
    }
    await sequelize.close();
  } catch {
    // ignore cleanup issues
  }
});

describe("content briefs & documents", () => {
  it("blocks cross-organization access to briefs and documents", async (ctx) => {
    if (!dbAvailable) ctx.skip();

    const alice = await authService.register(userA);
    const bob = await authService.register({ ...userB, email: `content-b2-${stamp}@test.local` });

    const project = await projectService.createProject(alice, {
      name: "Alice Content Site",
      website_url: `https://alice-content-${stamp}.example.com`,
    });

    const brief = await contentService.createContentBrief(alice, project.id, {
      keyword: "airport transfer lisbon",
      suggested_title: "Airport transfer Lisbon guide",
    });
    const doc = await contentService.createContentDocument(alice, project.id, {
      title: "Airport transfer Lisbon",
      content: "Some draft content about airport transfers in Lisbon.",
    });

    // Bob may not list, read, update or delete Alice's content
    await expect(contentService.listProjectBriefs(bob, project.id)).rejects.toThrow(/not found/i);
    await expect(contentService.getContentBrief(bob, brief.id)).rejects.toThrow(/not found/i);
    await expect(contentService.updateContentBrief(bob, brief.id, { keyword: "hijacked" })).rejects.toThrow(
      /not found/i,
    );
    await expect(contentService.deleteContentBrief(bob, brief.id, project.id)).rejects.toThrow(/not found/i);
    await expect(contentService.getContentDocument(bob, doc.id)).rejects.toThrow(/not found/i);
    await expect(contentService.deleteContentDocument(bob, doc.id)).rejects.toThrow(/not found/i);

    // Alice still has full access to her own data
    const listed = await contentService.listProjectBriefs(alice, project.id);
    expect(listed.total).toBe(1);
    expect(listed.items[0].keyword).toBe("airport transfer lisbon");
    expect(listed.items[0].suggested_title).toBe("Airport transfer Lisbon guide");

    const docs = await contentService.listProjectDocuments(alice, project.id);
    expect(docs.total).toBe(1);
    expect(docs.items[0].slug).toBe("airport-transfer-lisbon");

    await projectService.deleteProject(alice, project.id);
  });

  it("normalizes unknown search intents instead of failing on the DB enum", async (ctx) => {
    if (!dbAvailable) ctx.skip();

    const user = await authService.register({ ...userA, email: `content-c-${stamp}@test.local` });
    const project = await projectService.createProject(user, {
      name: "Intent Site",
      website_url: `https://intent-${stamp}.example.com`,
    });

    const brief = await contentService.createContentBrief(user, project.id, {
      keyword: "seo audit",
      search_intent: "totally-made-up",
    });
    expect(brief.search_intent).toBeNull();

    const valid = await contentService.createContentBrief(user, project.id, {
      keyword: "seo crawl",
      search_intent: "commercial",
    });
    expect(valid.search_intent).toBe("commercial");

    await projectService.deleteProject(user, project.id);
  });
});

describe("AI generation & usage limits", () => {
  it("generates demo-flagged content through the provider abstraction", async (ctx) => {
    if (!dbAvailable) ctx.skip();

    const user = await authService.register({ ...userA, email: `content-d-${stamp}@test.local` });
    const project = await projectService.createProject(user, {
      name: "Generation Site",
      website_url: `https://generation-${stamp}.example.com`,
    });

    const brief = await contentService.createContentBrief(user, project.id, {
      keyword: "keyword cannibalization",
      outline: "Introduction\nHow to detect it\nHow to fix it",
    });

    const doc = await contentService.generateContentWithAi(user, brief.id, { tone: "informative" });
    expect(String(doc.content ?? "").length).toBeGreaterThan(0);
    expect(doc.demo).toBe(true);
    expect(doc.provider).toBe("mock");

    const org = await organizationService.getPrimaryOrganization(user);
    const usage = await usageService.checkLimit(org.id, "ai_generations", 1);
    expect(usage.used).toBeGreaterThanOrEqual(1);

    await projectService.deleteProject(user, project.id);
  });

  it("enforces the plan's AI generation allowance from the database", async (ctx) => {
    if (!dbAvailable) ctx.skip();

    const user = await authService.register({ ...userA, email: `content-e-${stamp}@test.local` });
    const org = await organizationService.getPrimaryOrganization(user);
    const limits = await usageService.getPlanLimits(org.id);

    expect(limits.ai_generations).toBeGreaterThan(0);

    // Consume the whole monthly allowance through the public AI tool.
    for (let i = 0; i < limits.ai_generations; i += 1) {
      await contentService.runAiTool({ tool: "title", keyword: `limit test ${i}` }, user);
    }

    const check = await usageService.checkLimit(org.id, "ai_generations", 1);
    expect(check.allowed).toBe(false);

    await expect(
      contentService.runAiTool({ tool: "title", keyword: "one too many" }, user),
    ).rejects.toThrow(/plan allows/i);
  });

  it("runs the public AI tools anonymously without touching plan usage", async (ctx) => {
    if (!dbAvailable) ctx.skip();

    const anonymous = await contentService.runAiTool({ tool: "faq", topic: "local seo", count: 3 }, null);
    if (!("questions" in anonymous)) throw new Error("expected an FAQ result shape");
    expect(anonymous.questions).toHaveLength(3);
    expect(anonymous.demo).toBe(true);
  });

  it("analyzes readability without any external call", async (ctx) => {
    if (!dbAvailable) ctx.skip();

    const result = contentService.analyzeText(
      "A short sentence. Another short sentence about SEO content quality.",
    );
    expect(result.words).toBeGreaterThan(5);
    expect(result.sentences).toBe(2);
    expect(result.fleshReadingEase).toBeGreaterThan(0);
  });
});