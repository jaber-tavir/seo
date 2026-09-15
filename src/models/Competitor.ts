import { DataTypes, Model } from "sequelize";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { sequelize } from "@/config/database";

export class Competitor extends Model<InferAttributes<Competitor, { omit: "created_at" | "updated_at" }>, InferCreationAttributes<Competitor, { omit: "created_at" | "updated_at" }>> {
  declare id: CreationOptional<string>;
  declare project_id: string;
  declare domain: string;
  declare name: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Competitor.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    project_id: { type: DataTypes.UUID, allowNull: false },
    domain: { type: DataTypes.STRING(255), allowNull: false },
    name: { type: DataTypes.STRING(200) },
  },
  {
    sequelize,
    modelName: "Competitor",
    tableName: "competitors",
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ fields: ["project_id", "domain"], unique: true, name: "uq_competitor_project_domain" }, { fields: ["project_id"] }, { fields: ["domain"] }],
  }
);
