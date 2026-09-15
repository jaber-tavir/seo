import { z } from "zod";

/**
 * Centralized environment validation.
 * Every consumer imports `env` from here - process.env is never read directly.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  APP_URL: z.string().url().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // MySQL
  DATABASE_HOST: z.string().min(1).default("127.0.0.1"),
  DATABASE_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DATABASE_NAME: z.string().min(1).default("seo_tools"),
  DATABASE_USERNAME: z.string().min(1).default("root"),
  DATABASE_PASSWORD: z.string().default(""),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).default(10),

  // Redis
  REDIS_URL: z.string().min(1).default("redis://127.0.0.1:6379"),

  // Auth
  AUTH_SECRET: z.string().min(16).default("dev-only-secret-change-me-in-production"),
  AUTH_SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  AUTH_REQUIRE_EMAIL_VERIFICATION: z.string().default("false"),

  // OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Billing
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // External providers
  PAGESPEED_API_KEY: z.string().optional(),
  DATAFORSEO_LOGIN: z.string().optional(),
  DATAFORSEO_PASSWORD: z.string().optional(),
  SERP_API_KEY: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  AI_API_URL: z.string().url().optional().default("https://api.openai.com/v1"),
  AI_MODEL: z.string().min(1).default("gpt-4o-mini"),
  AI_PROVIDER: z.enum(["mock", "openai"]).optional(),

  // Crawler (Phase 2: site audit crawler)

  CRAWLER_MAX_PAGES: z.coerce.number().int().min(1).max(100000).default(5000),
  CRAWLER_MAX_DEPTH: z.coerce.number().int().min(0).max(10).default(3),
  CRAWLER_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(5),
  CRAWLER_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(15000),
  CRAWLER_MAX_BODY_BYTES: z.coerce.number().int().min(65536).default(5_000_000),
  CRAWLER_USER_AGENT: z.string().min(1).default("SEOAuditBot/1.0 (+https://localhost)"),
  CRAWLER_CRAWL_DELAY_MAX_MS: z.coerce.number().int().min(0).default(10_000),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().default("SEO Tools <no-reply@localhost>"),

  // Testing
  TEST_DATABASE_NAME: z.string().default("seo_tools_test"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  throw new Error("Invalid environment variables");
}

const data = parsed.data;

export const env = {
  ...data,
  isDevelopment: data.NODE_ENV === "development",
  isProduction: data.NODE_ENV === "production",
  isTest: data.NODE_ENV === "test",
  /** Email verification enforcement flag (relaxed for local dev) */
  requireEmailVerification: data.AUTH_REQUIRE_EMAIL_VERIFICATION === "true",
  /** Google OAuth is only enabled when credentials are configured */
  googleOAuthEnabled: Boolean(data.GOOGLE_CLIENT_ID && data.GOOGLE_CLIENT_SECRET),
};

if (env.isProduction && data.AUTH_SECRET.startsWith("dev-only")) {
  // Fail fast in production with an insecure default secret
  throw new Error("AUTH_SECRET must be set to a strong random value in production");
}
