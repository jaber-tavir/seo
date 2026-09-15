import "dotenv/config";
import { DEFAULT_PLANS } from "@/constants/plans";
import { logger } from "@/lib/logger";
import { planRepository } from "@/repositories/PlanRepository";
import { sequelize } from "@/config/database";

/**
 * Database seeder: upserts the configurable SaaS plans.
 * Run with `npm run db:seed` (idempotent).
 */
async function main() {
  try {
    await sequelize.authenticate();

    for (const plan of DEFAULT_PLANS) {
      await planRepository.upsertBySlug(plan);
      console.log(`  ✔ seeded plan: ${plan.name} (${plan.slug})`);
    }

    logger.info("seed_completed");
  } catch (err) {
    logger.error("seed_failed", { error: err });
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

void main();
