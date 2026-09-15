import { DataTypes, Model } from "sequelize";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { sequelize } from "@/config/database";
import { CRAWL_STATUSES, type CrawlStatus } from "@/constants";

/** A crawl run belonging to a site audit */
export class Crawl extends Model<InferAttributes<Crawl, { omit: "created_at" }>, InferCreationAttributes<Crawl, { omit: "created_at" }>> {
  declare id: CreationOptional<string>;
  declare audit_id: string;
  declare project_id: string;
  declare status: CreationOptional<CrawlStatus>;
  declare total_urls: CreationOptional<number>;
  declare processed_urls: CreationOptional<number>;
  declare failed_urls: CreationOptional<number>;
  declare started_at: CreationOptional<Date | null>;
  declare completed_at: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
}

Crawl.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    audit_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    status: { type: DataTypes.ENUM(...CRAWL_STATUSES), allowNull: false, defaultValue: "pending" },
    total_urls: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
    processed_urls: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
    failed_urls: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
    started_at: { type: DataTypes.DATE },
    completed_at: { type: DataTypes.DATE },
  },
  {
    sequelize,
    modelName: "Crawl",
    tableName: "crawls",
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ fields: ["audit_id"] }, { fields: ["project_id"] }, { fields: ["status"] }, { fields: ["created_at"] }],
  }
);
