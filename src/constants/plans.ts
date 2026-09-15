import type { BillingInterval } from "./index";

/**
 * Plan limits are stored in the `plans` table (JSON column) and are read by
 * the central UsageService - never hard-coded inside feature services.
 * -1 means unlimited.
 */
export interface PlanLimits {
  projects: number;
  crawled_pages: number;
  tracked_keywords: number;
  keyword_searches: number;
  audits: number;
  reports: number;
  api_requests: number;
  ai_generations: number;
  white_label_reports: boolean;
  api_access: boolean;
}

export interface PlanSeed {
  name: string;
  slug: string;
  price: number;
  billing_interval: BillingInterval;
  limits: PlanLimits;
  features: string[];
  sort_order: number;
  status: "active" | "inactive";
}

/**
 * Seed plans matching the product spec.
 * These are upserted by `npm run db:seed` and stay fully configurable in the DB.
 */
export const DEFAULT_PLANS: PlanSeed[] = [
  {
    name: "Free",
    slug: "free",
    price: 0,
    billing_interval: "monthly",
    limits: {
      projects: 1,
      crawled_pages: 100,
      tracked_keywords: 50,
      keyword_searches: 50,
      audits: 10,
      reports: 3,
      api_requests: 0,
      ai_generations: 20,
      white_label_reports: false,
      api_access: false,
    },
    features: [
      "1 project",
      "100 crawled pages / month",
      "50 tracked keywords",
      "50 keyword searches / month",
      "10 site audits / month",
      "20 AI generations / month",
      "Core SEO tools",
    ],
    sort_order: 1,
    status: "active",
  },
  {
    name: "Starter",
    slug: "starter",
    price: 19,
    billing_interval: "monthly",
    limits: {
      projects: 5,
      crawled_pages: 1000,
      tracked_keywords: 500,
      keyword_searches: 250,
      audits: 50,
      reports: 10,
      api_requests: 0,
      ai_generations: 100,
      white_label_reports: false,
      api_access: false,
    },
    features: [
      "5 projects",
      "1,000 crawled pages / month",
      "500 tracked keywords",
      "250 keyword searches / month",
      "50 site audits / month",
      "All core SEO tools",
      "Email support",
    ],
    sort_order: 2,
    status: "active",
  },
  {
    name: "Professional",
    slug: "professional",
    price: 49,
    billing_interval: "monthly",
    limits: {
      projects: 25,
      crawled_pages: 10000,
      tracked_keywords: 5000,
      keyword_searches: 2000,
      audits: 200,
      reports: 100,
      api_requests: 10000,
      ai_generations: 500,
      white_label_reports: false,
      api_access: true,
    },
    features: [
      "25 projects",
      "10,000 crawled pages / month",
      "5,000 tracked keywords",
      "2,000 keyword searches / month",
      "200 site audits / month",
      "API access (10,000 req / month)",
      "Priority support",
    ],
    sort_order: 3,
    status: "active",
  },
  {
    name: "Business",
    slug: "business",
    price: 199,
    billing_interval: "monthly",
    limits: {
      projects: 100,
      crawled_pages: 100000,
      tracked_keywords: 20000,
      keyword_searches: 10000,
      audits: 1000,
      reports: -1,
      api_requests: -1,
      ai_generations: 2000,
      white_label_reports: true,
      api_access: true,
    },
    features: [
      "100 projects",
      "100,000 crawled pages / month",
      "20,000 tracked keywords",
      "10,000 keyword searches / month",
      "1,000 site audits / month",
      "Unlimited reports",
      "White-label reports",
      "Full API access",
      "Dedicated support",
    ],
    sort_order: 4,
    status: "active",
  },
];
