import { DataTypes, Model } from "sequelize";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { sequelize } from "@/config/database";
import { API_KEY_STATUSES, type ApiKeyStatus } from "@/constants";

/**
 * API keys - only the SHA-256 hash is stored.
 * The raw key is displayed once at creation time.
 */
export class ApiKey extends Model<InferAttributes<ApiKey, { omit: "created_at" | "updated_at" }>, InferCreationAttributes<ApiKey, { omit: "created_at" | "updated_at" }>> {
  declare id: CreationOptional<string>;
  declare organization_id: string;
  declare name: string;
  declare key_hash: string;
  declare prefix: CreationOptional<string | null>; // display prefix e.g. "sk_live_abc12"
  declare last_used_at: CreationOptional<Date | null>;
  declare expires_at: CreationOptional<Date | null>;
  declare status: CreationOptional<ApiKeyStatus>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

ApiKey.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    key_hash: { type: DataTypes.CHAR(64), allowNull: false, unique: true },
    prefix: { type: DataTypes.STRING(20) },
    last_used_at: { type: DataTypes.DATE },
    expires_at: { type: DataTypes.DATE },
    status: { type: DataTypes.ENUM(...API_KEY_STATUSES), allowNull: false, defaultValue: "active" },
  },
  {
    sequelize,
    modelName: "ApiKey",
    tableName: "api_keys",
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ fields: ["organization_id"] }, { fields: ["status"] }],
  }
);
