import { DataTypes, Model } from "sequelize";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { sequelize } from "@/config/database";
import { NOTIFICATION_TYPES, type NotificationType } from "@/constants";

export class Notification extends Model<InferAttributes<Notification, { omit: "created_at" }>, InferCreationAttributes<Notification, { omit: "created_at" }>> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare type: NotificationType;
  declare title: string;
  declare message: string;
  declare read_at: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
}

Notification.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.ENUM(...NOTIFICATION_TYPES), allowNull: false, defaultValue: "system" },
    title: { type: DataTypes.STRING(255), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    read_at: { type: DataTypes.DATE },
  },
  {
    sequelize,
    modelName: "Notification",
    tableName: "notifications",
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ fields: ["user_id", "read_at"] }, { fields: ["created_at"] }],
  }
);
