import { DataTypes, Model } from "sequelize";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { sequelize } from "@/config/database";
import { AUDIT_STATUSES, type AuditStatus } from "@/constants";

export class SiteAudit extends Model<InferAttributes<SiteAudit, { omit: "created_at" | "updated_at" }>, InferCreationAttributes<SiteAudit, { omit: "created_at" | "updated_at" }>> {
  declare id: CreationOptional<string>;
  declare project_id: string;
  declare status: CreationOptional<AuditStatus>;
  declare score: CreationOptional<number | null>;
  declare health_score: CreationOptional<number | null>;
  declare pages_total: CreationOptional<number>;
  declare pages_crawled: CreationOptional<number>;
  declare errors: CreationOptional<number>;
  declare warnings: CreationOptional<number>;
  declare notices: CreationOptional<number>;
  declare started_at: CreationOptional<Date | null>;
  declare completed_at: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

SiteAudit.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    project_id: { type: DataTypes.UUID, allowNull: false },
    status: { type: DataTypes.ENUM(...AUDIT_STATUSES), allowNull: false, defaultValue: "pending" },
    score: { type: DataTypes.TINYINT.UNSIGNED },
    health_score: { type: DataTypes.TINYINT.UNSIGNED },
    pages_total: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
    pages_crawled: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
    errors: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
    warnings: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
    notices: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
    started_at: { type: DataTypes.DATE },
    completed_at: { type: DataTypes.DATE },
  },
  {
    sequelize,
    modelName: "SiteAudit",
    tableName: "site_audits",
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ fields: ["project_id"] }, { fields: ["status"] }, { fields: ["created_at"] }, { fields: ["project_id", "created_at"] }],
  }
);
