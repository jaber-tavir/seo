import { sequelize } from "@/config/database";
import { ApiKey } from "./ApiKey";
import { AuditLog } from "./AuditLog";
import { Backlink } from "./Backlink";
import { Competitor } from "./Competitor";
import { Content } from "./Content";
import { ContentBrief } from "./ContentBrief";
import { Crawl } from "./Crawl";
import { CrawlPage } from "./CrawlPage";
import { Keyword } from "./Keyword";
import { KeywordRanking } from "./KeywordRanking";
import { Notification } from "./Notification";
import { Organization } from "./Organization";
import { OrganizationMember } from "./OrganizationMember";
import { Plan } from "./Plan";
import { Project } from "./Project";
import { ReferringDomain } from "./ReferringDomain";
import { Report } from "./Report";
import { SeoIssue } from "./SeoIssue";
import { Session } from "./Session";
import { SiteAudit } from "./SiteAudit";
import { Subscription } from "./Subscription";
import { Usage } from "./Usage";
import { User } from "./User";
import { VerificationToken } from "./VerificationToken";

export {
  ApiKey,
  AuditLog,
  Backlink,
  Competitor,
  Content,
  ContentBrief,
  Crawl,
  CrawlPage,
  Keyword,
  KeywordRanking,
  Notification,
  Organization,
  OrganizationMember,
  Plan,
  Project,
  ReferringDomain,
  Report,
  SeoIssue,
  Session,
  SiteAudit,
  Subscription,
  Usage,
  User,
  VerificationToken,
};

/**
 * Central association registry. Aliases are used consistently everywhere
 * (queries always reference these `as` names).
 */
export function setupAssociations(): void {
  // ---- Plans & organizations
  Plan.hasMany(Organization, { foreignKey: "plan_id", as: "organizations" });
  Organization.belongsTo(Plan, { foreignKey: "plan_id", as: "plan" });

  User.hasMany(Organization, { foreignKey: "owner_id", as: "ownedOrganizations" });
  Organization.belongsTo(User, { foreignKey: "owner_id", as: "owner" });

  // ---- Memberships (future teams)
  Organization.hasMany(OrganizationMember, { foreignKey: "organization_id", as: "members" });
  OrganizationMember.belongsTo(Organization, { foreignKey: "organization_id", as: "organization" });
  OrganizationMember.belongsTo(User, { foreignKey: "user_id", as: "user" });
  User.hasMany(OrganizationMember, { foreignKey: "user_id", as: "memberships" });

  // ---- Billing
  Organization.hasOne(Subscription, { foreignKey: "organization_id", as: "subscription" });
  Subscription.belongsTo(Organization, { foreignKey: "organization_id", as: "organization" });
  Subscription.belongsTo(Plan, { foreignKey: "plan_id", as: "plan" });
  Plan.hasMany(Subscription, { foreignKey: "plan_id", as: "subscriptions" });

  Organization.hasMany(Usage, { foreignKey: "organization_id", as: "usageRecords" });
  Usage.belongsTo(Organization, { foreignKey: "organization_id", as: "organization" });

  Organization.hasMany(ApiKey, { foreignKey: "organization_id", as: "apiKeys" });
  ApiKey.belongsTo(Organization, { foreignKey: "organization_id", as: "organization" });

  Organization.hasMany(AuditLog, { foreignKey: "organization_id", as: "auditLogs" });
  AuditLog.belongsTo(Organization, { foreignKey: "organization_id", as: "organization" });

  // ---- Projects & SEO data
  Organization.hasMany(Project, { foreignKey: "organization_id", as: "projects" });
  Project.belongsTo(Organization, { foreignKey: "organization_id", as: "organization" });

  Project.hasMany(Keyword, { foreignKey: "project_id", as: "keywords" });
  Keyword.belongsTo(Project, { foreignKey: "project_id", as: "project" });

  Keyword.hasMany(KeywordRanking, { foreignKey: "keyword_id", as: "rankings" });
  KeywordRanking.belongsTo(Keyword, { foreignKey: "keyword_id", as: "keyword" });
  KeywordRanking.belongsTo(Project, { foreignKey: "project_id", as: "project" });
  Project.hasMany(KeywordRanking, { foreignKey: "project_id", as: "keywordRankings" });

  Project.hasMany(Competitor, { foreignKey: "project_id", as: "competitors" });
  Competitor.belongsTo(Project, { foreignKey: "project_id", as: "project" });

  Project.hasMany(SiteAudit, { foreignKey: "project_id", as: "audits" });
  SiteAudit.belongsTo(Project, { foreignKey: "project_id", as: "project" });

  SiteAudit.hasMany(Crawl, { foreignKey: "audit_id", as: "crawls" });
  Crawl.belongsTo(SiteAudit, { foreignKey: "audit_id", as: "audit" });

  Crawl.hasMany(CrawlPage, { foreignKey: "crawl_id", as: "pages" });
  CrawlPage.belongsTo(Crawl, { foreignKey: "crawl_id", as: "crawl" });

  SiteAudit.hasMany(SeoIssue, { foreignKey: "audit_id", as: "issues" });
  SeoIssue.belongsTo(SiteAudit, { foreignKey: "audit_id", as: "audit" });
  CrawlPage.hasMany(SeoIssue, { foreignKey: "crawl_page_id", as: "issues" });
  SeoIssue.belongsTo(CrawlPage, { foreignKey: "crawl_page_id", as: "page" });

  Project.hasMany(Backlink, { foreignKey: "project_id", as: "backlinks" });
  Backlink.belongsTo(Project, { foreignKey: "project_id", as: "project" });

  Project.hasMany(ReferringDomain, { foreignKey: "project_id", as: "referringDomains" });
  ReferringDomain.belongsTo(Project, { foreignKey: "project_id", as: "project" });

  Project.hasMany(ContentBrief, { foreignKey: "project_id", as: "contentBriefs" });
  ContentBrief.belongsTo(Project, { foreignKey: "project_id", as: "project" });

  Project.hasMany(Content, { foreignKey: "project_id", as: "contents" });
  Content.belongsTo(Project, { foreignKey: "project_id", as: "project" });

  Project.hasMany(Report, { foreignKey: "project_id", as: "reports" });
  Report.belongsTo(Project, { foreignKey: "project_id", as: "project" });

  // ---- User-owned records
  User.hasMany(Session, { foreignKey: "user_id", as: "sessions" });
  Session.belongsTo(User, { foreignKey: "user_id", as: "user" });

  User.hasMany(Notification, { foreignKey: "user_id", as: "notifications" });
  Notification.belongsTo(User, { foreignKey: "user_id", as: "user" });

  User.hasMany(VerificationToken, { foreignKey: "user_id", as: "verificationTokens" });
  VerificationToken.belongsTo(User, { foreignKey: "user_id", as: "user" });

}

setupAssociations();

export { sequelize };
