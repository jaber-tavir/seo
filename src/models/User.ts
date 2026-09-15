import { DataTypes, Model } from "sequelize";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { sequelize } from "@/config/database";
import { USER_ROLES, USER_STATUSES, type UserRole, type UserStatus } from "@/constants";

export class User extends Model<InferAttributes<User, { omit: "created_at" | "updated_at" }>, InferCreationAttributes<User, { omit: "created_at" | "updated_at" }>> {
  declare id: CreationOptional<string>;
  declare first_name: string | null;
  declare last_name: string | null;
  declare email: string;
  declare password_hash: string | null; // null for OAuth-only accounts
  declare avatar: string | null;
  declare role: CreationOptional<UserRole>;
  declare email_verified: CreationOptional<boolean>;
  declare status: CreationOptional<UserStatus>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  getFullName(): string {
    return [this.first_name, this.last_name].filter(Boolean).join(" ") || this.email;
  }

  isAdmin(): boolean {
    return this.role === "admin" || this.role === "super_admin";
  }
}

User.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    first_name: { type: DataTypes.STRING(100) },
    last_name: { type: DataTypes.STRING(100) },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
      set(value: string) {
        this.setDataValue("email", String(value).trim().toLowerCase());
      },
    },
    password_hash: { type: DataTypes.STRING(255) },
    avatar: { type: DataTypes.STRING(500) },
    role: { type: DataTypes.ENUM(...USER_ROLES), allowNull: false, defaultValue: "user" },
    email_verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    status: { type: DataTypes.ENUM(...USER_STATUSES), allowNull: false, defaultValue: "pending" },
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ fields: ["email"] }, { fields: ["role"] }, { fields: ["status"] }],
  }
);
