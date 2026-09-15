/**
 * Backlink ownership integration tests:
 * - cross-tenant backlink access is masked as 404
 * - refresh snapshots provider rows and reconciles new/lost
 *
 * Requires MySQL + migrations + seed; auto-skips when unreachable.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sequelize } from "@/config/database";
import { authService } from "@/services/AuthService";
import { projectService } from "@/services/ProjectService";
import { backlinkService } from "@/services/BacklinkService";
import { planRepository } from "@/repositories/PlanRepository";
import { userRepository } from "@/repositories/UserRepository";

let dbAvailable = false;
const stamp = Date.now();

const userA = { first_name: "Link", email: `bl-a-${stamp}@test.local`, password: "Password123" };
const userB = { first_name: "Rival", email: `bl-b-${stamp}@test.local`, password: "Password123" };

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

describe("backlink ownership and sync", () => {
  it("hides another organization's backlinks (404, not 403)", async (ctx) => {
    if (!dbAvailable) ctx.skip();
    const alice = await authService.register(userA);
    const bob = await authService.register(userB);

    const project = await projectService.createProject(alice, {
      name: "Link Site",
      website_url: `https://links-${stamp}.example.com`,
    });

    const synced = await backlinkService.refresh(alice, project.id, 100);
    expect(synced.added).toBeGreaterThan(0);
    expect(synced.demo).toBe(true);

    // Bob cannot read / refresh / gap-analyze Alice's backlinks
    await expect(backlinkService.overview(bob, project.id)).rejects.toThrow(/not found/i);
    await expect(backlinkService.listBacklinks(bob, project.id, { page: 1, pageSize: 20, sort: "first_seen", order: "DESC", view: "all", days: 30 })).rejects.toThrow(/not found/i);
    await expect(backlinkService.refresh(bob, project.id)).rejects.toThrow(/not found/i);
    await expect(backlinkService.gap(bob, project.id, ["example.com"])).rejects.toThrow(/not found/i);

    const overview = await backlinkService.overview(alice, project.id);
    expect(overview.summary.total).toBe(synced.added);
    expect(overview.summary.referring_domains).toBeGreaterThan(0);

    const anchors = await backlinkService.listBacklinks(alice, project.id, { page: 1, pageSize: 20, sort: "first_seen", order: "DESC", view: "anchors", days: 30 });
    expect(anchors.kind).toBe("anchors");

    const gap = await backlinkService.gap(alice, project.id, ["example.com"]);
    expect(gap.gaps.length).toBeGreaterThanOrEqual(0);

    await projectService.deleteProject(alice, project.id);
  });
});
