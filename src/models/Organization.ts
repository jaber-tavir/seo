import { DataTypes, Model } from "sequelize";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { sequelize } from "@/config/database";
import { ORGANIZATION_STATUSES, type OrganizationStatus } from "@/constants";

/**
 * Organization = tenant. All projects, usage and billing hang off it.
 * Every user gets a personal organization at registration; teams come later.
 */
export class Organization extends Model<InferAttributes<Organization, { omit: "created_at" | "updated_at" }>, InferCreationAttributes<Organization, { omit: "created_at" | "updated_at" }>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare owner_id: string;
  declare plan_id: string;
  declare status: CreationOptional<OrganizationStatus>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Organization.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    owner_id: { type: DataTypes.UUID, allowNull: false },
    plan_id: { type: DataTypes.UUID, allowNull: false },
    status: { type: DataTypes.ENUM(...ORGANIZATION_STATUSES), allowNull: false, defaultValue: "active" },
  },
  {
    sequelize,
    modelName: "Organization",
    tableName: "organizations",
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ fields: ["owner_id"] }, { fields: ["plan_id"] }, { fields: ["status"] }],
  }
);
