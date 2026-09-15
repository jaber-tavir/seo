import type { MigrationParams } from "../types";
import { fk, pk, TABLE_OPTIONS, timestamps, createdAtOnly } from "../helpers";
import { USER_ROLES, USER_STATUSES, NOTIFICATION_TYPES, VERIFICATION_TOKEN_TYPES, BILLING_INTERVALS } from "@/constants";

/** Migration 1: users, sessions, verification tokens, notifications, audit logs, API keys */
export async function up({ context }: MigrationParams): Promise<void> {
  const { queryInterface: qi, Sequelize: S } = context;

  await qi.createTable(
    "users",
    {
      id: pk(S),
      first_name: { type: S.STRING(100) },
      last_name: { type: S.STRING(100) },
      email: { type: S.STRING(255), allowNull: false, unique: true },
      password_hash: { type: S.STRING(255) },
      avatar: { type: S.STRING(500) },
      role: { type: S.ENUM(...USER_ROLES), allowNull: false, defaultValue: "user" },
      email_verified: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
      status: { type: S.ENUM(...USER_STATUSES), allowNull: false, defaultValue: "pending" },
      ...timestamps(S),
    },
    TABLE_OPTIONS
  );
  await qi.addIndex("users", ["role"], { name: "idx_users_role" });
  await qi.addIndex("users", ["status"], { name: "idx_users_status" });

  await qi.createTable(
    "sessions",
    {
      id: pk(S),
      user_id: fk(S, "users"),
      token_hash: { type: S.CHAR(64), allowNull: false, unique: true },
      user_agent: { type: S.STRING(500) },
      ip_address: { type: S.STRING(64) },
      expires_at: { type: S.DATE, allowNull: false },
      last_used_at: { type: S.DATE },
      ...createdAtOnly(S),
    },
    TABLE_OPTIONS
  );
  await qi.addIndex("sessions", ["user_id"], { name: "idx_sessions_user" });
  await qi.addIndex("sessions", ["expires_at"], { name: "idx_sessions_expires" });

  await qi.createTable(
    "verification_tokens",
    {
      id: pk(S),
      user_id: fk(S, "users"),
      token_hash: { type: S.CHAR(64), allowNull: false, unique: true },
      type: { type: S.ENUM(...VERIFICATION_TOKEN_TYPES), allowNull: false },
      expires_at: { type: S.DATE, allowNull: false },
      used_at: { type: S.DATE },
      ...createdAtOnly(S),
    },
    TABLE_OPTIONS
  );
  await qi.addIndex("verification_tokens", ["user_id", "type"], { name: "idx_verification_user_type" });
  await qi.addIndex("verification_tokens", ["expires_at"], { name: "idx_verification_expires" });

  await qi.createTable(
    "notifications",
    {
      id: pk(S),
      user_id: fk(S, "users"),
      type: { type: S.ENUM(...NOTIFICATION_TYPES), allowNull: false, defaultValue: "system" },
      title: { type: S.STRING(255), allowNull: false },
      message: { type: S.TEXT, allowNull: false },
      read_at: { type: S.DATE },
      ...createdAtOnly(S),
    },
    TABLE_OPTIONS
  );
  await qi.addIndex("notifications", ["user_id", "read_at"], { name: "idx_notifications_user_read" });
  await qi.addIndex("notifications", ["created_at"], { name: "idx_notifications_created" });

  await qi.createTable(
    "plans",
    {
      id: pk(S),
      name: { type: S.STRING(100), allowNull: false },
      slug: { type: S.STRING(100), allowNull: false, unique: true },
      price: { type: S.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      billing_interval: { type: S.ENUM(...BILLING_INTERVALS), allowNull: false, defaultValue: "monthly" },
      limits: { type: S.JSON, allowNull: false },
      features: { type: S.JSON, allowNull: false },
      sort_order: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
      status: { type: S.ENUM("active", "inactive"), allowNull: false, defaultValue: "active" },
      ...timestamps(S),
    },
    TABLE_OPTIONS
  );
  await qi.addIndex("plans", ["status"], { name: "idx_plans_status" });
}

export async function down({ context }: MigrationParams): Promise<void> {
  const { queryInterface: qi } = context;
  await qi.dropTable("plans");
  await qi.dropTable("notifications");
  await qi.dropTable("verification_tokens");
  await qi.dropTable("sessions");
  await qi.dropTable("users");
}
