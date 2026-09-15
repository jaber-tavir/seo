/**
 * Authorization integration tests - THE critical security property:
 * a user must never be able to access another organization's projects.
 *
 * Requirements: MySQL reachable with the configured DATABASE_* env vars,
 * migrations applied (`npm run migrate`) and plans seeded (`npm run db:seed`).
 * If the database is unreachable the suite is skipped.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sequelize } from "@/config/database";
import { authService } from "@/services/AuthService";
import { projectService } from "@/services/ProjectService";
import { usageService } from "@/services/UsageService";
import { organizationService } from "@/services/OrganizationService";
import { planRepository } from "@/repositories/PlanRepository";
import { userRepository } from "@/repositories/UserRepository";

let dbAvailable = false;
const stamp = Date.now();

const userA = { first_name: "Alice", email: `own-a-${stamp}@test.local`, password: "Password123" };
const userB = { first_name: "Bob", email: `own-b-${stamp}@test.local`, password: "Password123" };

beforeAll(async () => {
  try {
    await sequelize.authenticate();
    const freePlan = await planRepository.findBySlug("free");
    if (!freePlan) throw new Error("free plan missing");
    dbAvailable = true;
  } catch {
    dbAvailable = false; // skip integration suite when DB/seed unavailable
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

describe("organization/project ownership", () => {
  it("creates isolated personal organizations per user", async (ctx) => {
    if (!dbAvailable) ctx.skip();
    const createdA = await authService.register(userA);
    const createdB = await authService.register(userB);

    const orgA = await organizationService.getPrimaryOrganization(createdA);
    const orgB = await organizationService.getPrimaryOrganization(createdB);

    expect(orgA.id).not.toBe(orgB.id);
    expect(orgA.owner_id).toBe(createdA.id);
    expect(orgB.owner_id).toBe(createdB.id);
  });

  it("hides another organization's project (404, not 403)", async (ctx) => {
    if (!dbAvailable) ctx.skip();
    const createdA = await authService.register({ ...userA, email: `own-c-${stamp}@test.local` });
    const createdB = await authService.register({ ...userB, email: `own-d-${stamp}@test.local` });

    const project = await projectService.createProject(createdA, {
      name: "Alice Site",
      website_url: `https://alice-${stamp}.example.com`,
    });

    // Bob cannot read, update or delete Alice's project
    await expect(projectService.getAuthorizedProject(project.id, createdB)).rejects.toThrow(/not found/i);
    await expect(projectService.updateProject(createdB, project.id, { name: "Hacked" })).rejects.toThrow(/not found/i);
    await expect(projectService.deleteProject(createdB, project.id)).rejects.toThrow(/not found/i);

    // Alice can still work with her own project
    const own = await projectService.getAuthorizedProject(project.id, createdA);
    expect(own.id).toBe(project.id);

    await projectService.deleteProject(createdA, project.id);
  });

  it("enforces plan limits from the database (free plan = 1 project)", async (ctx) => {
    if (!dbAvailable) ctx.skip();
    const created = await authService.register({ ...userA, email: `own-e-${stamp}@test.local` });
    const org = await organizationService.getPrimaryOrganization(created);

    await projectService.createProject(created, {
      name: "First",
      website_url: `https://first-${stamp}.example.com`,
    });

    const check = await usageService.checkLimit(org.id, "projects", 1);
    expect(check.allowed).toBe(false);
    expect(check.limit).toBe(1);
    expect(check.used).toBe(1);

    await expect(
      projectService.createProject(created, { name: "Second", website_url: `https://second-${stamp}.example.com` })
    ).rejects.toThrow(/plan allows/i);
  });
});
