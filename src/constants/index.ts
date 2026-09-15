/**
 * Central application constants.
 * Enum values defined here are used by models, migrations and validators,
 * so the database and application layer always stay in sync.
 */

export const APP_NAME = "SEO Tools";
export const APP_TAGLINE = "The all-in-one SEO platform";

// ---------------------------------------------------------------- Roles & statuses

export const USER_ROLES = ["user", "admin", "super_admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["pending", "active", "suspended"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const MEMBER_ROLES = ["owner", "admin", "member", "viewer"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const ORGANIZATION_STATUSES = ["active", "suspended", "cancelled"] as const;
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

export const PROJECT_STATUSES = ["active", "paused", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const SEARCH_ENGINES = ["google", "bing", "yahoo", "youtube"] as const;
export type SearchEngine = (typeof SEARCH_ENGINES)[number];

export const DEVICES = ["desktop", "mobile", "tablet"] as const;
export type Device = (typeof DEVICES)[number];

// ---------------------------------------------------------------- Jobs & audits

export const JOB_STATUSES = ["pending", "processing", "completed", "failed", "cancelled"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const AUDIT_STATUSES = ["pending", "running", "completed", "failed", "cancelled"] as const;
export type AuditStatus = (typeof AUDIT_STATUSES)[number];

export const CRAWL_STATUSES = ["pending", "running", "completed", "failed", "cancelled"] as const;
export type CrawlStatus = (typeof CRAWL_STATUSES)[number];

export const ISSUE_SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export const ISSUE_TYPES = ["error", "warning", "notice"] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];

export const ISSUE_STATUSES = ["open", "fixed", "ignored"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

// ---------------------------------------------------------------- Keywords & backlinks

export const KEYWORD_INTENTS = ["informational", "commercial", "transactional", "navigational"] as const;
export type KeywordIntent = (typeof KEYWORD_INTENTS)[number];

export const COMPETITIONS = ["low", "medium", "high"] as const;
export type Competition = (typeof COMPETITIONS)[number];

export const LINK_TYPES = ["dofollow", "nofollow", "ugc", "sponsored"] as const;
export type LinkType = (typeof LINK_TYPES)[number];

export const BACKLINK_STATUSES = ["active", "lost"] as const;
export type BacklinkStatus = (typeof BACKLINK_STATUSES)[number];

// ---------------------------------------------------------------- Content & reports

export const CONTENT_STATUSES = ["draft", "in_review", "published"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const REPORT_TYPES = ["seo_audit", "rankings", "backlinks", "competitors", "full"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_STATUSES = ["pending", "generating", "completed", "failed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

// ---------------------------------------------------------------- Billing & usage

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "cancelled",
  "incomplete",
  "incomplete_expired",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const BILLING_INTERVALS = ["monthly", "yearly"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const USAGE_METRICS = [
  "projects",
  "crawled_pages",
  "keyword_searches",
  "tracked_keywords",
  "audits",
  "reports",
  "api_requests",
  "ai_generations",
] as const;
export type UsageMetric = (typeof USAGE_METRICS)[number];

/** Metrics that are a "stock" (current count) rather than a monthly "flow" */
export const STOCK_METRICS: readonly UsageMetric[] = ["projects", "tracked_keywords"];

/** Sentinel value for "unlimited" inside Plan.limits */
export const UNLIMITED = -1;

// ---------------------------------------------------------------- Auth & tokens

export const API_KEY_STATUSES = ["active", "revoked"] as const;
export type ApiKeyStatus = (typeof API_KEY_STATUSES)[number];

export const VERIFICATION_TOKEN_TYPES = ["email_verification", "password_reset"] as const;
export type VerificationTokenType = (typeof VERIFICATION_TOKEN_TYPES)[number];

export const NOTIFICATION_TYPES = [
  "audit_completed",
  "audit_failed",
  "ranking_changed",
  "backlink_new",
  "backlink_lost",
  "report_generated",
  "usage_limit_reached",
  "subscription_changed",
  "system",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// ---------------------------------------------------------------- Audit log actions

export const AUDIT_LOG_ACTIONS = {
  USER_REGISTERED: "user.registered",
  USER_LOGIN: "auth.login",
  USER_LOGIN_FAILED: "auth.login_failed",
  USER_LOGOUT: "auth.logout",
  USER_EMAIL_VERIFIED: "auth.email_verified",
  USER_PASSWORD_CHANGED: "auth.password_changed",
  USER_PASSWORD_RESET_REQUESTED: "auth.password_reset_requested",
  USER_PASSWORD_RESET: "auth.password_reset",
  USER_GOOGLE_LOGIN: "auth.google_login",
  BACKLINKS_SYNCED: "backlinks.synced",
  BACKLINK_ADDED: "backlink.added",
  BACKLINK_REMOVED: "backlink.removed",
  AUDIT_STARTED: "audit.started",
  AUDIT_COMPLETED: "audit.completed",
  AUDIT_FAILED: "audit.failed",
  SESSION_REVOKED: "auth.session_revoked",
  PROFILE_UPDATED: "account.profile_updated",
  ORGANIZATION_CREATED: "organization.created",
  PROJECT_CREATED: "project.created",
  PROJECT_UPDATED: "project.updated",
  PROJECT_DELETED: "project.deleted",
  KEYWORD_ADDED: "keyword.added",
  KEYWORD_REMOVED: "keyword.removed",
  KEYWORD_RESEARCHED: "keyword.researched",
  RANKING_CHECKED: "ranking.checked",
    KEYWORDS_CLUSTERED: "keyword.clustered",
  COMPETITOR_ADDED: "competitor.added",
  COMPETITOR_REMOVED: "competitor.removed",
  CONTENT_BRIEF_CREATED: "content_brief.created",
  CONTENT_BRIEF_UPDATED: "content_brief.updated",
  CONTENT_BRIEF_DELETED: "content_brief.deleted",
  CONTENT_DOCUMENT_CREATED: "content.created",
  CONTENT_DOCUMENT_UPDATED: "content.updated",
  CONTENT_DOCUMENT_DELETED: "content.deleted",
  CONTENT_GENERATED: "content.generated",
} as const;
export type AuditLogAction = (typeof AUDIT_LOG_ACTIONS)[keyof typeof AUDIT_LOG_ACTIONS];
