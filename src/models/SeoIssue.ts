import { DataTypes, Model } from "sequelize";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { sequelize } from "@/config/database";
import { ISSUE_SEVERITIES, ISSUE_STATUSES, ISSUE_TYPES, type IssueSeverity, type IssueStatus, type IssueType } from "@/constants";

export class SeoIssue extends Model<InferAttributes<SeoIssue, { omit: "created_at" | "updated_at" }>, InferCreationAttributes<SeoIssue, { omit: "created_at" | "updated_at" }>> {
  declare id: CreationOptional<string>;
  declare audit_id: string;
  declare crawl_page_id: CreationOptional<string | null>;
  declare type: IssueType;
  declare severity: IssueSeverity;
  declare title: string;
  declare description: CreationOptional<string | null>;
  declare recommendation: CreationOptional<string | null>;
  declare status: CreationOptional<IssueStatus>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

SeoIssue.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    audit_id: { type: DataTypes.UUID, allowNull: false },
    crawl_page_id: { type: DataTypes.UUID },
    type: { type: DataTypes.ENUM(...ISSUE_TYPES), allowNull: false },
    severity: { type: DataTypes.ENUM(...ISSUE_SEVERITIES), allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT },
    recommendation: { type: DataTypes.TEXT },
    status: { type: DataTypes.ENUM(...ISSUE_STATUSES), allowNull: false, defaultValue: "open" },
  },
  {
    sequelize,
    modelName: "SeoIssue",
    tableName: "seo_issues",
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["audit_id"] },
      { fields: ["crawl_page_id"] },
      { fields: ["severity"] },
      { fields: ["status"] },
      { fields: ["audit_id", "severity"] },
    ],
  }
);
