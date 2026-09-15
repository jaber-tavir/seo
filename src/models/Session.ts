import { DataTypes, Model } from "sequelize";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { sequelize } from "@/config/database";

/**
 * Server-side session store. The cookie holds a random raw token;
 * only its SHA-256 hash is persisted, so a DB leak cannot forge sessions.
 */
export class Session extends Model<InferAttributes<Session, { omit: "created_at" }>, InferCreationAttributes<Session, { omit: "created_at" }>> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare token_hash: string;
  declare user_agent: string | null;
  declare ip_address: string | null;
  declare expires_at: Date;
  declare last_used_at: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
}

Session.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    token_hash: { type: DataTypes.CHAR(64), allowNull: false, unique: true },
    user_agent: { type: DataTypes.STRING(500) },
    ip_address: { type: DataTypes.STRING(64) },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    last_used_at: { type: DataTypes.DATE },
  },
  {
    sequelize,
    modelName: "Session",
    tableName: "sessions",
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ fields: ["user_id"] }, { fields: ["expires_at"] }],
  }
);
