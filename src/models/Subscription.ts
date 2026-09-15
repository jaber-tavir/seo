import { DataTypes, Model } from "sequelize";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { sequelize } from "@/config/database";
import { SUBSCRIPTION_STATUSES, type SubscriptionStatus } from "@/constants";

/** Stripe subscription (Phase 9 wires the lifecycle) */
export class Subscription extends Model<InferAttributes<Subscription, { omit: "created_at" | "updated_at" }>, InferCreationAttributes<Subscription, { omit: "created_at" | "updated_at" }>> {
  declare id: CreationOptional<string>;
  declare organization_id: string;
  declare plan_id: string;
  declare stripe_customer_id: CreationOptional<string | null>;
  declare stripe_subscription_id: CreationOptional<string | null>;
  declare status: CreationOptional<SubscriptionStatus>;
  declare current_period_start: CreationOptional<Date | null>;
  declare current_period_end: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Subscription.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    plan_id: { type: DataTypes.UUID, allowNull: false },
    stripe_customer_id: { type: DataTypes.STRING(255) },
    stripe_subscription_id: { type: DataTypes.STRING(255) },
    status: { type: DataTypes.ENUM(...SUBSCRIPTION_STATUSES), allowNull: false, defaultValue: "active" },
    current_period_start: { type: DataTypes.DATE },
    current_period_end: { type: DataTypes.DATE },
  },
  {
    sequelize,
    modelName: "Subscription",
    tableName: "subscriptions",
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["organization_id"] },
      { fields: ["stripe_customer_id"] },
      { fields: ["stripe_subscription_id"] },
      { fields: ["status"] },
    ],
  }
);
