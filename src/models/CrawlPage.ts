import { DataTypes, Model } from "sequelize";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { sequelize } from "@/config/database";

/** A crawled page with extracted on-page data (Phase 2 analyzer populates this) */
export class CrawlPage extends Model<InferAttributes<CrawlPage>, InferCreationAttributes<CrawlPage>> {
  declare id: CreationOptional<string>;
  declare crawl_id: string;
  declare url: string;
  declare status_code: CreationOptional<number | null>;
  declare response_time: CreationOptional<number | null>; // ms
  declare title: CreationOptional<string | null>;
  declare meta_description: CreationOptional<string | null>;
  declare h1: CreationOptional<string | null>;
  declare canonical: CreationOptional<string | null>;
  declare robots: CreationOptional<string | null>;
  declare word_count: CreationOptional<number>;
  declare page_size: CreationOptional<number>; // bytes
  declare internal_links: CreationOptional<number>;
  declare external_links: CreationOptional<number>;
  declare images_count: CreationOptional<number>;
  declare images_missing_alt: CreationOptional<number>;
  declare depth: CreationOptional<number>; // crawl depth from seed URL
  declare content_hash: CreationOptional<string | null>; // for duplicate content detection
  declare indexable: CreationOptional<boolean>;
  declare crawled_at: CreationOptional<Date | null>;
}

CrawlPage.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    crawl_id: { type: DataTypes.UUID, allowNull: false },
    url: { type: DataTypes.STRING(2048), allowNull: false },
    status_code: { type: DataTypes.INTEGER.UNSIGNED },
    response_time: { type: DataTypes.INTEGER.UNSIGNED },
    title: { type: DataTypes.STRING(500) },
    meta_description: { type: DataTypes.STRING(1000) },
    h1: { type: DataTypes.STRING(500) },
    canonical: { type: DataTypes.STRING(2048) },
    robots: { type: DataTypes.STRING(255) },
    word_count: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
    page_size: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
    internal_links: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
    external_links: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
    images_count: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
    images_missing_alt: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
    depth: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
    content_hash: { type: DataTypes.CHAR(64) },
    indexable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    crawled_at: { type: DataTypes.DATE },
  },
  {
    sequelize,
    modelName: "CrawlPage",
    tableName: "crawl_pages",
    createdAt: false,
    updatedAt: false,
    indexes: [
      { fields: ["crawl_id"] },
      { fields: ["status_code"] },
      { fields: ["indexable"] },
      { fields: ["crawl_id", "indexable"] },
    ],
  }
);
