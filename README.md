# SEO Tools — All-in-One SEO SaaS Platform

A production-oriented, modular **All-in-One SEO SaaS platform** (think Semrush/Ahrefs-class product with a simpler, faster UX) built with:

- **Next.js (App Router) + TypeScript + React Server Components**
- **Tailwind CSS v4 + shadcn/ui + Lucide + Recharts**
- **MySQL + Sequelize ORM (migrations, associations, transactions — no `sequelize.sync()`)**
- **Redis** (caching, rate limiting; BullMQ queues arrive with the crawler phase)
- **Zod validation everywhere**, consistent API envelope, centralized error handling

> **Status: Phase 1 (Foundation) + Phase 2 (SEO Audit) + Phase 3 (SEO Tools) + Phase 4
> (Keywords) + Phase 5 (Competitors) + Phase 6 (Backlinks) complete.** Auth, organizations,
> projects, usage limits, dashboard shell, billing/usage overview and the full data model are
> live, plus a real site crawler (SSRF-safe HTTP client → robots.txt → BullMQ queue (userland
> fallback when Redis is down) → HTML extraction → on-page/technical analysis → SEO scores →
> audit dashboard), the 8 core free SEO tools (meta tags, SERP preview, schema, XML sitemap,
> robots.txt, keyword density — all client-side — plus redirect tracer and broken-link verifier
> over the SSRF-safe fetch layer) with indexable `/tools/[slug]` pages, a provider-based
> keyword system (research, tracking, clustering, rank history), competitor analysis (domain
> keywords, overlap, comparison, content gap, `/competitors` pages) and a provider-based
> backlink system (snapshot sync, new/lost detection, referring domains, anchors, backlink
> gap, `/backlinks` pages).
> See the [Roadmap](#10-roadmap) for Phases 7–10.

---

## 1. Requirements

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | ≥ 20 (22 LTS recommended) | |
| MySQL | ≥ 8.0 (or MariaDB 10.6+) | Laragon/XAMPP both work |
| Redis | ≥ 6 | Optional in dev — the app degrades gracefully without it |
| npm | ≥ 10 | |

## 2. Installation

```bash
# 1. Install dependencies
npm install

# 2. Create your env file
cp .env.example .env
# then edit values (see section 6)

# 3. Start MySQL in Laragon, then create the database
mysql -u root -e "CREATE DATABASE IF NOT EXISTS seo_tools CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"

# 4. Run migrations (schema) — do NOT use sequelize.sync()
npm run migrate

# 5. Seed the configurable plans (Free / Starter / Professional / Business)
npm run db:seed

# 6. Start developing
npm run dev
```

Open http://localhost:3000 — create an account, add a project, done.



