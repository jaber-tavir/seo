import { DataTypes, Model } from "sequelize";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { sequelize } from "@/config/database";
import { VERIFICATION_TOKEN_TYPES, type VerificationTokenType } from "@/constants";

/** Email verification / password reset tokens (hashed at rest) */
export class VerificationToken extends Model<
  InferAttributes<VerificationToken, { omit: "created_at" }>,
  InferCreationAttributes<VerificationToken, { omit: "created_at" }>
> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare token_hash: string;
  declare type: VerificationTokenType;
  declare expires_at: Date;
  declare used_at: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
}

VerificationToken.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    token_hash: { type: DataTypes.CHAR(64), allowNull: false, unique: true },
    type: { type: DataTypes.ENUM(...VERIFICATION_TOKEN_TYPES), allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    used_at: { type: DataTypes.DATE },
  },
  {
    sequelize,
    modelName: "VerificationToken",
    tableName: "verification_tokens",
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ fields: ["user_id", "type"] }, { fields: ["expires_at"] }],
  }
);
