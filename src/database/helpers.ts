import { DataTypes, literal } from "sequelize";

/** Shared column helpers so migrations and models stay consistent */

export function pk(..._args: unknown[]) {
  void _args;
  return { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false };
}

export function fk(...args: unknown[]) {
  // Supports both fk("table", opts) and the legacy fk(S, "table", opts).
  const [first, second, third] = args;
  const table = (typeof second === "string" ? second : first) as string;
  const opts = (typeof second === "object" && second !== null
    ? (second as { onDelete?: "CASCADE" | "SET NULL" | "RESTRICT"; allowNull?: boolean })
    : ((third as { onDelete?: "CASCADE" | "SET NULL" | "RESTRICT"; allowNull?: boolean } | undefined) ?? {}));
  return {
    type: DataTypes.UUID,
    allowNull: opts.allowNull ?? false,
    references: { model: table, key: "id" },
    onUpdate: "CASCADE" as const,
    onDelete: opts.onDelete ?? "CASCADE",
  };
}

export function timestamps(..._args: unknown[]) {
  void _args;
  return {
    created_at: { type: DataTypes.DATE(3), allowNull: false, defaultValue: literal("CURRENT_TIMESTAMP(3)") },
    updated_at: { type: DataTypes.DATE(3), allowNull: false, defaultValue: literal("CURRENT_TIMESTAMP(3)") },
  };
}

export function createdAtOnly(..._args: unknown[]) {
  void _args;
  return {
    created_at: { type: DataTypes.DATE(3), allowNull: false, defaultValue: literal("CURRENT_TIMESTAMP(3)") },
  };
}

export const TABLE_OPTIONS = { charset: "utf8mb4", collate: "utf8mb4_unicode_ci", engine: "InnoDB" };
