import { DataTypes, Model } from "sequelize";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { sequelize } from "@/config/database";
import { USAGE_METRICS, type UsageMetric } from "@/constants";

/**
 * Monthly usage counters per organization & metric.
 * One row per (organization, metric, period_start) - enforced by a unique index.
 */
export class Usage extends Model<InferAttributes<Usage, { omit: "created_at" | "updated_at" }>, InferCreationAttributes<Usage, { omit: "created_at" | "updated_at" }>> {
  declare id: CreationOptional<string>;
  declare organization_id: string;
  declare metric: UsageMetric;
  declare amount: CreationOptional<number>;
  declare period_start: Date;
  declare period_end: Date;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Usage.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    metric: { type: DataTypes.ENUM(...USAGE_METRICS), allowNull: false },
    amount: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    period_start: { type: DataTypes.DATE, allowNull: false },
    period_end: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    modelName: "Usage",
    tableName: "usages",
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["organization_id", "metric", "period_start"], unique: true, name: "uq_usage_org_metric_period" },
      { fields: ["period_start"] },
    ],
  }
);
