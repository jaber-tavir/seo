import { DataTypes, Model } from "sequelize";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { sequelize } from "@/config/database";

export class ReferringDomain extends Model<
  InferAttributes<ReferringDomain>,
  InferCreationAttributes<ReferringDomain>
> {
  declare id: CreationOptional<string>;
  declare project_id: string;
  declare domain: string;
  declare domain_authority: CreationOptional<number | null>;
  declare backlinks_count: CreationOptional<number>;
  declare first_seen: CreationOptional<Date | null>;
  declare last_seen: CreationOptional<Date | null>;
}

ReferringDomain.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    project_id: { type: DataTypes.UUID, allowNull: false },
    domain: { type: DataTypes.STRING(255), allowNull: false },
    domain_authority: { type: DataTypes.FLOAT },
    backlinks_count: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
    first_seen: { type: DataTypes.DATE },
    last_seen: { type: DataTypes.DATE },
  },
  {
    sequelize,
    modelName: "ReferringDomain",
    tableName: "referring_domains",
    createdAt: false,
    updatedAt: false,
    indexes: [{ fields: ["project_id", "domain"], unique: true, name: "uq_referring_domain" }, { fields: ["project_id"] }, { fields: ["domain"] }],
  }
);
