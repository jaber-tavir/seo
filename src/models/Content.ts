import { DataTypes, Model } from "sequelize";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { sequelize } from "@/config/database";
import { CONTENT_STATUSES, type ContentStatus } from "@/constants";

export class Content extends Model<InferAttributes<Content, { omit: "created_at" | "updated_at" }>, InferCreationAttributes<Content, { omit: "created_at" | "updated_at" }>> {
  declare id: CreationOptional<string>;
  declare project_id: string;
  declare title: string;
  declare slug: string;
  declare content: CreationOptional<string | null>;
  declare meta_title: CreationOptional<string | null>;
  declare meta_description: CreationOptional<string | null>;
  declare status: CreationOptional<ContentStatus>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Content.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    project_id: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING(500), allowNull: false },
    slug: { type: DataTypes.STRING(500), allowNull: false },
    content: { type: DataTypes.TEXT("long") },
    meta_title: { type: DataTypes.STRING(255) },
    meta_description: { type: DataTypes.STRING(500) },
    status: { type: DataTypes.ENUM(...CONTENT_STATUSES), allowNull: false, defaultValue: "draft" },
  },
  {
    sequelize,
    modelName: "Content",
    tableName: "contents",
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ fields: ["project_id"] }, { fields: ["slug"] }, { fields: ["status"] }, { fields: ["project_id", "slug"] }],
  }
);
