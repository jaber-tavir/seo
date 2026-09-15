import type { MigrationParams } from "../types";
import { fk, pk, TABLE_OPTIONS, timestamps, createdAtOnly } from "../helpers";
import {
  PROJECT_STATUSES,
  SEARCH_ENGINES,
  COMPETITIONS,
  KEYWORD_INTENTS,
  DEVICES,
  AUDIT_STATUSES,
  CRAWL_STATUSES,
  ISSUE_TYPES,
  ISSUE_SEVERITIES,
  ISSUE_STATUSES,
  LINK_TYPES,
  BACKLINK_STATUSES,
  CONTENT_STATUSES,
  REPORT_TYPES,
  REPORT_STATUSES,
} from "@/constants";

/** Migration 3: projects and the SEO data core */
export async function up({ context }: MigrationParams): Promise<void> {
  const { queryInterface: qi, Sequelize: S } = context;

  await qi.createTable(
    "projects",
    {
      id: pk(S),
      organization_id: fk(S, "organizations"),
      name: { type: S.STRING(200), allowNull: false },
      website_url: { type: S.STRING(2048), allowNull: false },
      domain: { type: S.STRING(255), allowNull: false },
      country: { type: S.STRING(2), allowNull: false, defaultValue: "us" },
      language: { type: S.STRING(5), allowNull: false, defaultValue: "en" },
      search_engine: { type: S.ENUM(...SEARCH_ENGINES), allowNull: false, defaultValue: "google" },
      sitemap_url: { type: S.STRING(2048) },
      status: { type: S.ENUM(...PROJECT_STATUSES), allowNull: false, defaultValue: "active" },
      last_audit_at: { type: S.DATE },
      ...timestamps(S),
    },
    TABLE_OPTIONS
  );
  await qi.addIndex("projects", ["organization_id", "domain"], { name: "uq_project_org_domain", unique: true });
  await qi.addIndex("projects", ["organization_id"], { name: "idx_projects_org" });
  await qi.addIndex("projects", ["domain"], { name: "idx_projects_domain" });
  await qi.addIndex("projects", ["status"], { name: "idx_projects_status" });
  await qi.addIndex("projects", ["created_at"], { name: "idx_projects_created" });

  await qi.createTable(
    "keywords",
    {
      id: pk(S),
      project_id: fk(S, "projects"),
      keyword: { type: S.STRING(255), allowNull: false },
      search_volume: { type: S.INTEGER },
      difficulty: { type: S.TINYINT.UNSIGNED },
      cpc: { type: S.DECIMAL(10, 2) },
      competition: { type: S.ENUM(...COMPETITIONS) },
      intent: { type: S.ENUM(...KEYWORD_INTENTS) },
      country: { type: S.STRING(2), allowNull: false, defaultValue: "us" },
      language: { type: S.STRING(5), allowNull: false, defaultValue: "en" },
      ...timestamps(S),
    },
    TABLE_OPTIONS
  );
  await qi.addIndex("keywords", ["project_id", "keyword", "country"], { name: "uq_keyword_project_kw_country", unique: true });
  await qi.addIndex("keywords", ["project_id"], { name: "idx_keywords_project" });
  await qi.addIndex("keywords", ["keyword"], { name: "idx_keywords_keyword" });

  await qi.createTable(
    "keyword_rankings",
    {
      id: pk(S),
      keyword_id: fk(S, "keywords"),
      project_id: fk(S, "projects"),
      position: { type: S.INTEGER.UNSIGNED },
      previous_position: { type: S.INTEGER.UNSIGNED },
      best_position: { type: S.INTEGER.UNSIGNED },
      ranking_url: { type: S.STRING(2048) },
      search_engine: { type: S.ENUM(...SEARCH_ENGINES), allowNull: false, defaultValue: "google" },
      device: { type: S.ENUM(...DEVICES), allowNull: false, defaultValue: "desktop" },
      country: { type: S.STRING(2), allowNull: false, defaultValue: "us" },
      city: { type: S.STRING(100) },
      language: { type: S.STRING(5), allowNull: false, defaultValue: "en" },
      checked_at: { type: S.DATE, allowNull: false },
      ...createdAtOnly(S),
    },
    TABLE_OPTIONS
  );
  await qi.addIndex("keyword_rankings", ["project_id"], { name: "idx_rankings_project" });
  await qi.addIndex("keyword_rankings", ["keyword_id"], { name: "idx_rankings_keyword" });
  await qi.addIndex("keyword_rankings", ["checked_at"], { name: "idx_rankings_checked" });
  await qi.addIndex("keyword_rankings", ["position"], { name: "idx_rankings_position" });
  await qi.addIndex("keyword_rankings", ["project_id", "checked_at"], { name: "idx_rankings_project_checked" });

  await qi.createTable(
    "competitors",
    {
      id: pk(S),
      project_id: fk(S, "projects"),
      domain: { type: S.STRING(255), allowNull: false },
      name: { type: S.STRING(200) },
      ...timestamps(S),
    },
    TABLE_OPTIONS
  );
  await qi.addIndex("competitors", ["project_id", "domain"], { name: "uq_competitor_project_domain", unique: true });
  await qi.addIndex("competitors", ["project_id"], { name: "idx_competitors_project" });
  await qi.addIndex("competitors", ["domain"], { name: "idx_competitors_domain" });

  await qi.createTable(
    "site_audits",
    {
      id: pk(S),
      project_id: fk(S, "projects"),
      status: { type: S.ENUM(...AUDIT_STATUSES), allowNull: false, defaultValue: "pending" },
      score: { type: S.TINYINT.UNSIGNED },
      health_score: { type: S.TINYINT.UNSIGNED },
      pages_total: { type: S.INTEGER.UNSIGNED, defaultValue: 0 },
      pages_crawled: { type: S.INTEGER.UNSIGNED, defaultValue: 0 },
      errors: { type: S.INTEGER.UNSIGNED, defaultValue: 0 },
      warnings: { type: S.INTEGER.UNSIGNED, defaultValue: 0 },
      notices: { type: S.INTEGER.UNSIGNED, defaultValue: 0 },
      started_at: { type: S.DATE },
      completed_at: { type: S.DATE },
      ...timestamps(S),
    },
    TABLE_OPTIONS
  );
  await qi.addIndex("site_audits", ["project_id"], { name: "idx_audits_project" });
  await qi.addIndex("site_audits", ["status"], { name: "idx_audits_status" });
  await qi.addIndex("site_audits", ["created_at"], { name: "idx_audits_created" });
  await qi.addIndex("site_audits", ["project_id", "created_at"], { name: "idx_audits_project_created" });

  await qi.createTable(
    "crawls",
    {
      id: pk(S),
      audit_id: fk(S, "site_audits"),
      project_id: fk(S, "projects"),
      status: { type: S.ENUM(...CRAWL_STATUSES), allowNull: false, defaultValue: "pending" },
      total_urls: { type: S.INTEGER.UNSIGNED, defaultValue: 0 },
      processed_urls: { type: S.INTEGER.UNSIGNED, defaultValue: 0 },
      failed_urls: { type: S.INTEGER.UNSIGNED, defaultValue: 0 },
      started_at: { type: S.DATE },
      completed_at: { type: S.DATE },
      ...createdAtOnly(S),
    },
    TABLE_OPTIONS
  );
  await qi.addIndex("crawls", ["audit_id"], { name: "idx_crawls_audit" });
  await qi.addIndex("crawls", ["project_id"], { name: "idx_crawls_project" });
  await qi.addIndex("crawls", ["status"], { name: "idx_crawls_status" });

  await qi.createTable(
    "crawl_pages",
    {
      id: pk(S),
      crawl_id: fk(S, "crawls"),
      url: { type: S.STRING(2048), allowNull: false },
      status_code: { type: S.INTEGER.UNSIGNED },
      response_time: { type: S.INTEGER.UNSIGNED },
      title: { type: S.STRING(500) },
      meta_description: { type: S.STRING(1000) },
      h1: { type: S.STRING(500) },
      canonical: { type: S.STRING(2048) },
      robots: { type: S.STRING(255) },
      word_count: { type: S.INTEGER.UNSIGNED, defaultValue: 0 },
      page_size: { type: S.INTEGER.UNSIGNED, defaultValue: 0 },
      internal_links: { type: S.INTEGER.UNSIGNED, defaultValue: 0 },
      external_links: { type: S.INTEGER.UNSIGNED, defaultValue: 0 },
      images_count: { type: S.INTEGER.UNSIGNED, defaultValue: 0 },
      images_missing_alt: { type: S.INTEGER.UNSIGNED, defaultValue: 0 },
      depth: { type: S.INTEGER.UNSIGNED, defaultValue: 0 },
      content_hash: { type: S.CHAR(64) },
      indexable: { type: S.BOOLEAN, allowNull: false, defaultValue: true },
      crawled_at: { type: S.DATE },
    },
    TABLE_OPTIONS
  );
  await qi.addIndex("crawl_pages", ["crawl_id"], { name: "idx_crawl_pages_crawl" });
  await qi.addIndex("crawl_pages", ["status_code"], { name: "idx_crawl_pages_status" });
  await qi.addIndex("crawl_pages", ["indexable"], { name: "idx_crawl_pages_indexable" });
  await qi.addIndex("crawl_pages", ["crawl_id", "indexable"], { name: "idx_crawl_pages_crawl_indexable" });

  await qi.createTable(
    "seo_issues",
    {
      id: pk(S),
      audit_id: fk(S, "site_audits"),
      crawl_page_id: fk(S, "crawl_pages", { onDelete: "CASCADE", allowNull: true }),
      type: { type: S.ENUM(...ISSUE_TYPES), allowNull: false },
      severity: { type: S.ENUM(...ISSUE_SEVERITIES), allowNull: false },
      title: { type: S.STRING(255), allowNull: false },
      description: { type: S.TEXT },
      recommendation: { type: S.TEXT },
      status: { type: S.ENUM(...ISSUE_STATUSES), allowNull: false, defaultValue: "open" },
      ...timestamps(S),
    },
    TABLE_OPTIONS
  );
  await qi.addIndex("seo_issues", ["audit_id"], { name: "idx_issues_audit" });
  await qi.addIndex("seo_issues", ["crawl_page_id"], { name: "idx_issues_page" });
  await qi.addIndex("seo_issues", ["severity"], { name: "idx_issues_severity" });
  await qi.addIndex("seo_issues", ["status"], { name: "idx_issues_status" });
  await qi.addIndex("seo_issues", ["audit_id", "severity"], { name: "idx_issues_audit_severity" });

  await qi.createTable(
    "backlinks",
    {
      id: pk(S),
      project_id: fk(S, "projects"),
      source_url: { type: S.STRING(2048), allowNull: false },
      target_url: { type: S.STRING(2048), allowNull: false },
      anchor_text: { type: S.STRING(500) },
      domain: { type: S.STRING(255) },
      domain_authority: { type: S.FLOAT },
      link_type: { type: S.ENUM(...LINK_TYPES), defaultValue: "dofollow" },
      status: { type: S.ENUM(...BACKLINK_STATUSES), allowNull: false, defaultValue: "active" },
      first_seen: { type: S.DATE },
      last_seen: { type: S.DATE },
      ...timestamps(S),
    },
    TABLE_OPTIONS
  );
  await qi.addIndex("backlinks", ["project_id"], { name: "idx_backlinks_project" });
  await qi.addIndex("backlinks", ["domain"], { name: "idx_backlinks_domain" });
  await qi.addIndex("backlinks", ["status"], { name: "idx_backlinks_status" });
  await qi.addIndex("backlinks", ["project_id", "status"], { name: "idx_backlinks_project_status" });
  await qi.addIndex("backlinks", ["first_seen"], { name: "idx_backlinks_first_seen" });

  await qi.createTable(
    "referring_domains",
    {
      id: pk(S),
      project_id: fk(S, "projects"),
      domain: { type: S.STRING(255), allowNull: false },
      domain_authority: { type: S.FLOAT },
      backlinks_count: { type: S.INTEGER.UNSIGNED, defaultValue: 0 },
      first_seen: { type: S.DATE },
      last_seen: { type: S.DATE },
    },
    TABLE_OPTIONS
  );
  await qi.addIndex("referring_domains", ["project_id", "domain"], { name: "uq_referring_domain", unique: true });
  await qi.addIndex("referring_domains", ["project_id"], { name: "idx_referring_project" });
  await qi.addIndex("referring_domains", ["domain"], { name: "idx_referring_domain" });

  await qi.createTable(
    "content_briefs",
    {
      id: pk(S),
      project_id: fk(S, "projects"),
      keyword: { type: S.STRING(255), allowNull: false },
      search_intent: { type: S.ENUM(...KEYWORD_INTENTS) },
      suggested_title: { type: S.STRING(500) },
      outline: { type: S.JSON },
      competitor_urls: { type: S.JSON },
      related_keywords: { type: S.JSON },
      questions: { type: S.JSON },
      ...timestamps(S),
    },
    TABLE_OPTIONS
  );
  await qi.addIndex("content_briefs", ["project_id"], { name: "idx_briefs_project" });
  await qi.addIndex("content_briefs", ["keyword"], { name: "idx_briefs_keyword" });
  await qi.addIndex("content_briefs", ["created_at"], { name: "idx_briefs_created" });

  await qi.createTable(
    "contents",
    {
      id: pk(S),
      project_id: fk(S, "projects"),
      title: { type: S.STRING(500), allowNull: false },
      slug: { type: S.STRING(500), allowNull: false },
      content: { type: S.TEXT("long") },
      meta_title: { type: S.STRING(255) },
      meta_description: { type: S.STRING(500) },
      status: { type: S.ENUM(...CONTENT_STATUSES), allowNull: false, defaultValue: "draft" },
      ...timestamps(S),
    },
    TABLE_OPTIONS
  );
  await qi.addIndex("contents", ["project_id"], { name: "idx_contents_project" });
  await qi.addIndex("contents", ["slug"], { name: "idx_contents_slug" });
  await qi.addIndex("contents", ["status"], { name: "idx_contents_status" });
  await qi.addIndex("contents", ["project_id", "slug"], { name: "idx_contents_project_slug" });

  await qi.createTable(
    "reports",
    {
      id: pk(S),
      project_id: fk(S, "projects"),
      type: { type: S.ENUM(...REPORT_TYPES), allowNull: false },
      title: { type: S.STRING(255), allowNull: false },
      status: { type: S.ENUM(...REPORT_STATUSES), allowNull: false, defaultValue: "pending" },
      file_path: { type: S.STRING(500) },
      ...timestamps(S),
    },
    TABLE_OPTIONS
  );
  await qi.addIndex("reports", ["project_id"], { name: "idx_reports_project" });
  await qi.addIndex("reports", ["type"], { name: "idx_reports_type" });
  await qi.addIndex("reports", ["status"], { name: "idx_reports_status" });
  await qi.addIndex("reports", ["created_at"], { name: "idx_reports_created" });





}

export async function down({ context }: MigrationParams): Promise<void> {
  const { queryInterface: qi } = context;
  await qi.dropTable("reports");
  await qi.dropTable("contents");
  await qi.dropTable("content_briefs");
  await qi.dropTable("referring_domains");
  await qi.dropTable("backlinks");
  await qi.dropTable("seo_issues");
  await qi.dropTable("crawl_pages");
  await qi.dropTable("crawls");
  await qi.dropTable("site_audits");
  await qi.dropTable("competitors");
  await qi.dropTable("keyword_rankings");
  await qi.dropTable("keywords");
  await qi.dropTable("projects");
}
