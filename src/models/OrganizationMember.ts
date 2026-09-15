import { DataTypes, Model } from "sequelize";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { sequelize } from "@/config/database";
import { MEMBER_ROLES, type MemberRole } from "@/constants";

/** Future team functionality - a user can belong to many organizations */
export class OrganizationMember extends Model<
  InferAttributes<OrganizationMember, { omit: "created_at" | "updated_at" }>,
  InferCreationAttributes<OrganizationMember, { omit: "created_at" | "updated_at" }>
> {
  declare id: CreationOptional<string>;
  declare organization_id: string;
  declare user_id: string;
  declare role: CreationOptional<MemberRole>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

OrganizationMember.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: false },
    role: { type: DataTypes.ENUM(...MEMBER_ROLES), allowNull: false, defaultValue: "member" },
  },
  {
    sequelize,
    modelName: "OrganizationMember",
    tableName: "organization_members",
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["organization_id", "user_id"], unique: true, name: "uq_org_member" },
      { fields: ["user_id"] },
    ],
  }
);
