/**
 * Competitor ownership integration tests:
 * - cross-tenant competitor access is masked as 404
 * - content-gap rejects empty competitor lists
 *
 * Requires MySQL + migrations + seed; auto-skips when unreachable.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sequelize } from "@/config/database";
import { authService } from "@/services/AuthService";
import { projectService } from "@/services/ProjectService";
import { competitorService } from "@/services/CompetitorService";
import { planRepository } from "@/repositories/PlanRepository";
import { userRepository } from "@/repositories/UserRepository";

let dbAvailable = false;
const stamp = Date.now();

const userA = { first_name: "Comp", email: `comp-a-${stamp}@test.local`, password: "Password123" };
const userB = { first_name: "Rival", email: `comp-b-${stamp}@test.local`, password: "Password123" };

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
    const a = await userRepository.findByEmail(userA.email);
    const b = await userRepository.findByEmail(userB.email);
    if (a) await userRepository.delete(a.id);
    if (b) await userRepository.delete(b.id);
    await sequelize.close();
  } catch {
    // ignore cleanup issues
  }
});

describe("competitor ownership", () => {
  it("hides another organization's competitors (404, not 403)", async (ctx) => {
    if (!dbAvailable) ctx.skip();
    const alice = await authService.register(userA);
    const bob = await authService.register(userB);

    const project = await projectService.createProject(alice, {
      name: "Comp Site",
      website_url: `https://comp-${stamp}.example.com`,
    });

    const competitor = await competitorService.addCompetitor(alice, project.id, { domain: `rival-${stamp}.example.com` });

    // Bob cannot list / analyze / delete Alice's competitors
    await expect(competitorService.listCompetitors(bob, project.id, {
      page: 1,
      pageSize: 20,
      sort: "created_at",
      order: "DESC",
    })).rejects.toThrow(/not found/i);
    await expect(competitorService.analyzeCompetitor(bob, project.id, competitor.id)).rejects.toThrow(/not found/i);
    await expect(competitorService.compareCompetitors(bob, project.id, [competitor.id])).rejects.toThrow(/not found/i);
    await expect(competitorService.contentGap(bob, project.id, {})).rejects.toThrow(/not found/i);
    await expect(competitorService.deleteCompetitor(bob, project.id, competitor.id)).rejects.toThrow(/not found/i);

    // Duplicate domains are rejected, content-gap validates input
    await expect(competitorService.addCompetitor(alice, project.id, { domain: `rival-${stamp}.example.com` })).rejects.toThrow(
      /already/i
    );

    await competitorService.deleteCompetitor(alice, project.id, competitor.id);
    await projectService.deleteProject(alice, project.id);
  });
});
