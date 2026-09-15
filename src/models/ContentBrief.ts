import { DataTypes, Model } from "sequelize";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { sequelize } from "@/config/database";
import { KEYWORD_INTENTS, type KeywordIntent } from "@/constants";

/** AI-generated content brief (Phase 7) */
export class ContentBrief extends Model<InferAttributes<ContentBrief, { omit: "created_at" | "updated_at" }>, InferCreationAttributes<ContentBrief, { omit: "created_at" | "updated_at" }>> {
  declare id: CreationOptional<string>;
  declare project_id: string;
  declare keyword: string;
  declare search_intent: CreationOptional<KeywordIntent | null>;
  declare suggested_title: CreationOptional<string | null>;
  declare outline: CreationOptional<object | null>;
  declare competitor_urls: CreationOptional<string[] | null>;
  declare related_keywords: CreationOptional<string[] | null>;
  declare questions: CreationOptional<string[] | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

ContentBrief.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    project_id: { type: DataTypes.UUID, allowNull: false },
    keyword: { type: DataTypes.STRING(255), allowNull: false },
    search_intent: { type: DataTypes.ENUM(...KEYWORD_INTENTS) },
    suggested_title: { type: DataTypes.STRING(500) },
    outline: { type: DataTypes.JSON },
    competitor_urls: { type: DataTypes.JSON },
    related_keywords: { type: DataTypes.JSON },
    questions: { type: DataTypes.JSON },
  },
  {
    sequelize,
    modelName: "ContentBrief",
    tableName: "content_briefs",
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ fields: ["project_id"] }, { fields: ["keyword"] }, { fields: ["created_at"] }],
  }
);
