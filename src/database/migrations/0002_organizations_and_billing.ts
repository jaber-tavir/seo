import type { MigrationParams } from "../types";
import { fk, pk, TABLE_OPTIONS, timestamps, createdAtOnly } from "../helpers";
import {
  ORGANIZATION_STATUSES,
  MEMBER_ROLES,
  SUBSCRIPTION_STATUSES,
  USAGE_METRICS,
  API_KEY_STATUSES,
} from "@/constants";

/** Migration 2: organizations, members, subscriptions, usage counters, audit logs, API keys */
export async function up({ context }: MigrationParams): Promise<void> {
  const { queryInterface: qi, Sequelize: S } = context;

  await qi.createTable(
    "organizations",
    {
      id: pk(S),
      name: { type: S.STRING(200), allowNull: false },
      owner_id: fk(S, "users"),
      plan_id: fk(S, "plans", { onDelete: "RESTRICT" }),
      status: { type: S.ENUM(...ORGANIZATION_STATUSES), allowNull: false, defaultValue: "active" },
      ...timestamps(S),
    },
    TABLE_OPTIONS
  );
  await qi.addIndex("organizations", ["owner_id"], { name: "idx_organizations_owner" });
  await qi.addIndex("organizations", ["plan_id"], { name: "idx_organizations_plan" });
  await qi.addIndex("organizations", ["status"], { name: "idx_organizations_status" });

  await qi.createTable(
    "organization_members",
    {
      id: pk(S),
      organization_id: fk(S, "organizations"),
      user_id: fk(S, "users"),
      role: { type: S.ENUM(...MEMBER_ROLES), allowNull: false, defaultValue: "member" },
      ...timestamps(S),
    },
    TABLE_OPTIONS
  );
  await qi.addIndex("organization_members", ["organization_id", "user_id"], {
    name: "uq_org_member",
    unique: true,
  });
  await qi.addIndex("organization_members", ["user_id"], { name: "idx_org_members_user" });

  await qi.createTable(
    "subscriptions",
    {
      id: pk(S),
      organization_id: fk(S, "organizations"),
      plan_id: fk(S, "plans", { onDelete: "RESTRICT" }),
      stripe_customer_id: { type: S.STRING(255) },
      stripe_subscription_id: { type: S.STRING(255) },
      status: { type: S.ENUM(...SUBSCRIPTION_STATUSES), allowNull: false, defaultValue: "active" },
      current_period_start: { type: S.DATE },
      current_period_end: { type: S.DATE },
      ...timestamps(S),
    },
    TABLE_OPTIONS
  );
  await qi.addIndex("subscriptions", ["organization_id"], { name: "idx_subscriptions_org" });
  await qi.addIndex("subscriptions", ["stripe_customer_id"], { name: "idx_subscriptions_customer" });
  await qi.addIndex("subscriptions", ["stripe_subscription_id"], { name: "idx_subscriptions_sub" });
  await qi.addIndex("subscriptions", ["status"], { name: "idx_subscriptions_status" });

  await qi.createTable(
    "usages",
    {
      id: pk(S),
      organization_id: fk(S, "organizations"),
      metric: { type: S.ENUM(...USAGE_METRICS), allowNull: false },
      amount: { type: S.BIGINT, allowNull: false, defaultValue: 0 },
      period_start: { type: S.DATE, allowNull: false },
      period_end: { type: S.DATE, allowNull: false },
      ...timestamps(S),
    },
    TABLE_OPTIONS
  );
  await qi.addIndex("usages", ["organization_id", "metric", "period_start"], {
    name: "uq_usage_org_metric_period",
    unique: true,
  });
  await qi.addIndex("usages", ["period_start"], { name: "idx_usages_period" });


  await qi.createTable(
    "audit_logs",
    {
      id: pk(S),
      organization_id: fk(S, "organizations", { onDelete: "SET NULL", allowNull: true }),
      user_id: fk(S, "users", { onDelete: "SET NULL", allowNull: true }),
      action: { type: S.STRING(100), allowNull: false },
      entity_type: { type: S.STRING(50) },
      entity_id: { type: S.STRING(64) },
      metadata: { type: S.JSON },
      ip_address: { type: S.STRING(64) },
      user_agent: { type: S.STRING(500) },
      ...createdAtOnly(S),
    },
    TABLE_OPTIONS
  );
  await qi.addIndex("audit_logs", ["organization_id", "created_at"], { name: "idx_audit_org_created" });
  await qi.addIndex("audit_logs", ["user_id"], { name: "idx_audit_user" });
  await qi.addIndex("audit_logs", ["action"], { name: "idx_audit_action" });
  await qi.addIndex("audit_logs", ["entity_type", "entity_id"], { name: "idx_audit_entity" });

  await qi.createTable(
    "api_keys",
    {
      id: pk(S),
      organization_id: fk(S, "organizations"),
      name: { type: S.STRING(100), allowNull: false },
      key_hash: { type: S.CHAR(64), allowNull: false, unique: true },
      prefix: { type: S.STRING(20) },
      last_used_at: { type: S.DATE },
      expires_at: { type: S.DATE },
      status: { type: S.ENUM(...API_KEY_STATUSES), allowNull: false, defaultValue: "active" },
      ...timestamps(S),
    },
    TABLE_OPTIONS
  );
  await qi.addIndex("api_keys", ["organization_id"], { name: "idx_api_keys_org" });
  await qi.addIndex("api_keys", ["status"], { name: "idx_api_keys_status" });
}

export async function down({ context }: MigrationParams): Promise<void> {
  const { queryInterface: qi } = context;
  await qi.dropTable("api_keys");
  await qi.dropTable("audit_logs");
  await qi.dropTable("usages");
  await qi.dropTable("subscriptions");
  await qi.dropTable("organization_members");
  await qi.dropTable("organizations");

}
