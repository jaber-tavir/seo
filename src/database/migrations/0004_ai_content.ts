import type { MigrationParams } from "../types";
import { USAGE_METRICS } from "@/constants";

/** Migration 4: add the ai_generations usage metric (Phase 7 - AI content). */
export async function up({ context }: MigrationParams): Promise<void> {
  const { queryInterface: qi, Sequelize: S } = context;

  // usages.metric is an ENUM - widen it to include ai_generations.
  await qi.changeColumn("usages", "metric", {
    type: S.ENUM(...USAGE_METRICS),
    allowNull: false,
  });
}

export async function down({ context }: MigrationParams): Promise<void> {
  const { queryInterface: qi, Sequelize: S } = context;
  const previous = USAGE_METRICS.filter((m) => m !== "ai_generations");
  await qi.changeColumn("usages", "metric", {
    type: S.ENUM(...previous),
    allowNull: false,
  });
}