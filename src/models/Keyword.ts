import { DataTypes, Model } from "sequelize";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { sequelize } from "@/config/database";
import { COMPETITIONS, KEYWORD_INTENTS, type Competition, type KeywordIntent } from "@/constants";

/**
 * A tracked/researched keyword.
 * Real metrics (volume, difficulty, cpc) must come from a configured keyword
 * provider - the application never fabricates them.
 */
export class Keyword extends Model<InferAttributes<Keyword, { omit: "created_at" | "updated_at" }>, InferCreationAttributes<Keyword, { omit: "created_at" | "updated_at" }>> {
  declare id: CreationOptional<string>;
  declare project_id: string;
  declare keyword: string;
  declare search_volume: CreationOptional<number | null>;
  declare difficulty: CreationOptional<number | null>;
  declare cpc: CreationOptional<number | null>;
  declare competition: CreationOptional<Competition | null>;
  declare intent: CreationOptional<KeywordIntent | null>;
  declare country: CreationOptional<string>;
  declare language: CreationOptional<string>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Keyword.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    project_id: { type: DataTypes.UUID, allowNull: false },
    keyword: { type: DataTypes.STRING(255), allowNull: false },
    search_volume: { type: DataTypes.INTEGER },
    difficulty: { type: DataTypes.TINYINT.UNSIGNED },
    cpc: { type: DataTypes.DECIMAL(10, 2) },
    competition: { type: DataTypes.ENUM(...COMPETITIONS) },
    intent: { type: DataTypes.ENUM(...KEYWORD_INTENTS) },
    country: { type: DataTypes.STRING(2), allowNull: false, defaultValue: "us" },
    language: { type: DataTypes.STRING(5), allowNull: false, defaultValue: "en" },
  },
  {
    sequelize,
    modelName: "Keyword",
    tableName: "keywords",
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["project_id", "keyword", "country"], unique: true, name: "uq_keyword_project_kw_country" },
      { fields: ["project_id"] },
      { fields: ["keyword"] },
    ],
  }
);
