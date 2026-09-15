import { DataTypes, Model } from "sequelize";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { sequelize } from "@/config/database";
import { REPORT_STATUSES, REPORT_TYPES, type ReportStatus, type ReportType } from "@/constants";

export class Report extends Model<InferAttributes<Report, { omit: "created_at" | "updated_at" }>, InferCreationAttributes<Report, { omit: "created_at" | "updated_at" }>> {
  declare id: CreationOptional<string>;
  declare project_id: string;
  declare type: ReportType;
  declare title: string;
  declare status: CreationOptional<ReportStatus>;
  declare file_path: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Report.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    project_id: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.ENUM(...REPORT_TYPES), allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    status: { type: DataTypes.ENUM(...REPORT_STATUSES), allowNull: false, defaultValue: "pending" },
    file_path: { type: DataTypes.STRING(500) },
  },
  {
    sequelize,
    modelName: "Report",
    tableName: "reports",
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ fields: ["project_id"] }, { fields: ["type"] }, { fields: ["status"] }, { fields: ["created_at"] }],
  }
);
