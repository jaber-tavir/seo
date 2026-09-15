import { DataTypes, Model } from "sequelize";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { sequelize } from "@/config/database";
import { BACKLINK_STATUSES, LINK_TYPES, type BacklinkStatus, type LinkType } from "@/constants";

/**
 * Backlinks come from real providers (Phase 6) - never fabricated metrics.
 */
export class Backlink extends Model<InferAttributes<Backlink, { omit: "created_at" | "updated_at" }>, InferCreationAttributes<Backlink, { omit: "created_at" | "updated_at" }>> {
  declare id: CreationOptional<string>;
  declare project_id: string;
  declare source_url: string;
  declare target_url: string;
  declare anchor_text: CreationOptional<string | null>;
  declare domain: CreationOptional<string | null>;
  declare domain_authority: CreationOptional<number | null>;
  declare link_type: CreationOptional<LinkType>;
  declare status: CreationOptional<BacklinkStatus>;
  declare first_seen: CreationOptional<Date | null>;
  declare last_seen: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Backlink.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    project_id: { type: DataTypes.UUID, allowNull: false },
    source_url: { type: DataTypes.STRING(2048), allowNull: false },
    target_url: { type: DataTypes.STRING(2048), allowNull: false },
    anchor_text: { type: DataTypes.STRING(500) },
    domain: { type: DataTypes.STRING(255) },
    domain_authority: { type: DataTypes.FLOAT },
    link_type: { type: DataTypes.ENUM(...LINK_TYPES), defaultValue: "dofollow" },
    status: { type: DataTypes.ENUM(...BACKLINK_STATUSES), allowNull: false, defaultValue: "active" },
    first_seen: { type: DataTypes.DATE },
    last_seen: { type: DataTypes.DATE },
  },
  {
    sequelize,
    modelName: "Backlink",
    tableName: "backlinks",
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["project_id"] },
      { fields: ["domain"] },
      { fields: ["status"] },
      { fields: ["project_id", "status"] },
      { fields: ["first_seen"] },
    ],
  }
);
