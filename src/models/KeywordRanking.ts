import { DataTypes, Model } from "sequelize";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { sequelize } from "@/config/database";
import { DEVICES, SEARCH_ENGINES, type Device, type SearchEngine } from "@/constants";

/** Historical ranking snapshot - one row per keyword check */
export class KeywordRanking extends Model<
  InferAttributes<KeywordRanking, { omit: "created_at" }>,
  InferCreationAttributes<KeywordRanking, { omit: "created_at" }>
> {
  declare id: CreationOptional<string>;
  declare keyword_id: string;
  declare project_id: string;
  declare position: CreationOptional<number | null>; // null = not found in top results
  declare previous_position: CreationOptional<number | null>;
  declare best_position: CreationOptional<number | null>;
  declare ranking_url: CreationOptional<string | null>;
  declare search_engine: CreationOptional<SearchEngine>;
  declare device: CreationOptional<Device>;
  declare country: CreationOptional<string>;
  declare city: CreationOptional<string | null>;
  declare language: CreationOptional<string>;
  declare checked_at: Date;
  declare created_at: CreationOptional<Date>;
}

KeywordRanking.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    keyword_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    position: { type: DataTypes.INTEGER.UNSIGNED },
    previous_position: { type: DataTypes.INTEGER.UNSIGNED },
    best_position: { type: DataTypes.INTEGER.UNSIGNED },
    ranking_url: { type: DataTypes.STRING(2048) },
    search_engine: { type: DataTypes.ENUM(...SEARCH_ENGINES), allowNull: false, defaultValue: "google" },
    device: { type: DataTypes.ENUM(...DEVICES), allowNull: false, defaultValue: "desktop" },
    country: { type: DataTypes.STRING(2), allowNull: false, defaultValue: "us" },
    city: { type: DataTypes.STRING(100) },
    language: { type: DataTypes.STRING(5), allowNull: false, defaultValue: "en" },
    checked_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    modelName: "KeywordRanking",
    tableName: "keyword_rankings",
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      { fields: ["project_id"] },
      { fields: ["keyword_id"] },
      { fields: ["checked_at"] },
      { fields: ["position"] },
      { fields: ["project_id", "checked_at"] },
    ],
  }
);
