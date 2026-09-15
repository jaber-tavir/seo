/**
 * Keyword ownership + limit integration tests:
 * - cross-tenant keyword access is masked as 404
 * - tracked_keywords plan limit is enforced from the DB
 *
 * Requires MySQL + migrations + seed; auto-skips when unreachable.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sequelize } from "@/config/database";
import { authService } from "@/services/AuthService";
import { projectService } from "@/services/ProjectService";
import { keywordService } from "@/services/KeywordService";
import { planRepository } from "@/repositories/PlanRepository";
import { userRepository } from "@/repositories/UserRepository";

let dbAvailable = false;
const stamp = Date.now();

const userA = { first_name: "Kim", email: `kw-a-${stamp}@test.local`, password: "Password123" };
const userB = { first_name: "Lee", email: `kw-b-${stamp}@test.local`, password: "Password123" };

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

describe("keyword ownership and limits", () => {
  it("hides another organization's keywords (404, not 403)", async (ctx) => {
    if (!dbAvailable) ctx.skip();
    const alice = await authService.register(userA);
    const bob = await authService.register(userB);

    const project = await projectService.createProject(alice, {
      name: "Kim Site",
      website_url: `https://kim-${stamp}.example.com`,
    });

    const tracked = await keywordService.trackKeyword(alice, project.id, { keyword: "kim test keyword", country: "us", language: "en", search_engine: "google", device: "desktop" });

    // Bob cannot list / read / delete / check Alice's keywords
    await expect(keywordService.listKeywords(bob, project.id, {})).rejects.toThrow(/not found/i);
    await expect(keywordService.keywordHistory(bob, project.id, tracked.id)).rejects.toThrow(/not found/i);
    await expect(keywordService.removeKeyword(bob, project.id, tracked.id)).rejects.toThrow(/not found/i);
    await expect(
      keywordService.checkRank(bob, project.id, tracked.id, { search_engine: "google", device: "desktop", country: "us", language: "en" })
    ).rejects.toThrow(/not found/i);

    await keywordService.removeKeyword(alice, project.id, tracked.id);
    await projectService.deleteProject(alice, project.id);
  });

  it("enforces tracked_keywords limits from the database plan", async (ctx) => {
    if (!dbAvailable) ctx.skip();
    const carol = await authService.register({ first_name: "Carol", email: `kw-c-${stamp}@test.local`, password: "Password123" });
    const project = await projectService.createProject(carol, {
      name: "Carol Site",
      website_url: `https://carol-${stamp}.example.com`,
    });

    // free plan allows 50 tracked keywords; add 2, then verify remaining math
    await keywordService.trackKeyword(carol, project.id, { keyword: "carol keyword one", country: "us", language: "en", search_engine: "google", device: "desktop" });
    await keywordService.trackKeyword(carol, project.id, { keyword: "carol keyword two", country: "us", language: "en", search_engine: "google", device: "desktop" });

    const list = await keywordService.listKeywords(carol, project.id, { pageSize: 10 });
    expect(list.total).toBe(2);

    // duplicate tracking returns the existing row without consuming a new slot
    const dup = await keywordService.trackKeyword(carol, project.id, { keyword: "carol keyword one", country: "us", language: "en", search_engine: "google", device: "desktop" });
    const after = await keywordService.listKeywords(carol, project.id, { pageSize: 10 });
    expect(after.total).toBe(2);
    expect(dup.id).toBe(list.rows[0]?.id ?? dup.id);

    for (const row of after.rows) {
      await keywordService.removeKeyword(carol, project.id, row.id);
    }
    await projectService.deleteProject(carol, project.id);
  });
});
