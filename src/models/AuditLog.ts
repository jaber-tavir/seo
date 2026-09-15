import { DataTypes, Model } from "sequelize";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { sequelize } from "@/config/database";

/** Security / activity audit trail (immutable) */
export class AuditLog extends Model<InferAttributes<AuditLog, { omit: "created_at" }>, InferCreationAttributes<AuditLog, { omit: "created_at" }>> {
  declare id: CreationOptional<string>;
  declare organization_id: string | null;
  declare user_id: string | null;
  declare action: string;
  declare entity_type: string | null;
  declare entity_id: string | null;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare ip_address: string | null;
  declare user_agent: string | null;
  declare created_at: CreationOptional<Date>;
}

AuditLog.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID },
    user_id: { type: DataTypes.UUID },
    action: { type: DataTypes.STRING(100), allowNull: false },
    entity_type: { type: DataTypes.STRING(50) },
    entity_id: { type: DataTypes.STRING(64) },
    metadata: { type: DataTypes.JSON },
    ip_address: { type: DataTypes.STRING(64) },
    user_agent: { type: DataTypes.STRING(500) },
  },
  {
    sequelize,
    modelName: "AuditLog",
    tableName: "audit_logs",
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      { fields: ["organization_id", "created_at"] },
      { fields: ["user_id"] },
      { fields: ["action"] },
      { fields: ["entity_type", "entity_id"] },
    ],
  }
);
