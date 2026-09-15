import { DataTypes, Model } from "sequelize";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { sequelize } from "@/config/database";
import { PROJECT_STATUSES, SEARCH_ENGINES, type ProjectStatus, type SearchEngine } from "@/constants";

export class Project extends Model<InferAttributes<Project, { omit: "created_at" | "updated_at" }>, InferCreationAttributes<Project, { omit: "created_at" | "updated_at" }>> {
  declare id: CreationOptional<string>;
  declare organization_id: string;
  declare name: string;
  declare website_url: string;
  declare domain: string;
  declare country: CreationOptional<string>;
  declare language: CreationOptional<string>;
  declare search_engine: CreationOptional<SearchEngine>;
  declare sitemap_url: CreationOptional<string | null>;
  declare status: CreationOptional<ProjectStatus>;
  declare last_audit_at: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Project.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING(200), allowNull: false },
    website_url: { type: DataTypes.STRING(2048), allowNull: false },
    domain: { type: DataTypes.STRING(255), allowNull: false },
    country: { type: DataTypes.STRING(2), allowNull: false, defaultValue: "us" },
    language: { type: DataTypes.STRING(5), allowNull: false, defaultValue: "en" },
    search_engine: { type: DataTypes.ENUM(...SEARCH_ENGINES), allowNull: false, defaultValue: "google" },
    sitemap_url: { type: DataTypes.STRING(2048) },
    status: { type: DataTypes.ENUM(...PROJECT_STATUSES), allowNull: false, defaultValue: "active" },
    last_audit_at: { type: DataTypes.DATE },
  },
  {
    sequelize,
    modelName: "Project",
    tableName: "projects",
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["organization_id", "domain"], unique: true, name: "uq_project_org_domain" },
      { fields: ["organization_id"] },
      { fields: ["domain"] },
      { fields: ["status"] },
      { fields: ["created_at"] },
    ],
  }
);
