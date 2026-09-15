import { DataTypes, Model } from "sequelize";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { sequelize } from "@/config/database";
import { BILLING_INTERVALS, type BillingInterval } from "@/constants";
import type { PlanLimits } from "@/constants/plans";

/** SaaS plans - limits & features are fully database-configurable */
export class Plan extends Model<InferAttributes<Plan, { omit: "created_at" | "updated_at" }>, InferCreationAttributes<Plan, { omit: "created_at" | "updated_at" }>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare slug: string;
  declare price: CreationOptional<number>;
  declare billing_interval: CreationOptional<BillingInterval>;
  declare limits: CreationOptional<PlanLimits>;
  declare features: CreationOptional<string[]>;
  declare sort_order: CreationOptional<number>;
  declare status: CreationOptional<"active" | "inactive">;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Plan.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    billing_interval: { type: DataTypes.ENUM(...BILLING_INTERVALS), allowNull: false, defaultValue: "monthly" },
    limits: { type: DataTypes.JSON, allowNull: false },
    features: { type: DataTypes.JSON, allowNull: false },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.ENUM("active", "inactive"), allowNull: false, defaultValue: "active" },
  },
  {
    sequelize,
    modelName: "Plan",
    tableName: "plans",
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ fields: ["slug"] }, { fields: ["status"] }],
  }
);
