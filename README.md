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

### MySQL setup notes

- Charset `utf8mb4` / collation `utf8mb4_unicode_ci` is enforced by both migrations and the Sequelize instance.
- The default Laragon credentials are usually `root` with an empty password at `127.0.0.1:3306`; if your MySQL password differs, update `DATABASE_PASSWORD` in `.env`.
- Verify that MySQL is running before migrating: `mysqladmin ping -h 127.0.0.1 -u root` (add `-p` when a password is configured). A connection-refused error means the Laragon MySQL service is stopped or uses another port.
- The app **never** runs `sequelize.sync()`. All schema changes are new migration files in
  `src/database/migrations/` — keep them ordered and commit them with the model change.

### Windows / Laragon troubleshooting

Run commands from the project directory (`D:\laragon\www\seo_tools`) in PowerShell or Command Prompt. The database commands use Node's module loader directly rather than the `tsx` shell shim, which avoids `tsx: Permission denied` when `node_modules` is on a mounted Windows/Laragon filesystem. If a migration fails, first run `npm run migrate:status`; confirm that `.env` exists, the database name and credentials are correct, and MySQL is listening on the configured host and port. Then rerun `npm run migrate`.

### Redis setup

- Laragon: enable Redis from the menu (or `redis-server.exe`), default `redis://127.0.0.1:6379`.
- No Redis? The app still runs: caching is skipped and rate limiting falls back to an
  in-memory per-process window. **In production always run Redis.**
- BullMQ queues/workers (crawls, rank checks, reports) arrive in Phase 2 and reuse
  `src/config/redis.ts`.

## 3. Commands

```bash
npm run dev            # Next.js dev server
npm run build          # production build
npm run start          # production server
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm run test           # vitest (unit + integration)
npm run test:watch     # vitest watch

npm run migrate        # apply pending migrations (up)
npm run migrate:undo   # revert last migration (down)
npm run migrate:status # list executed/pending
npm run db:seed        # upsert configurable plans
```

## 4. Architecture

```
Request (Next.js UI / RSC)
        │
        ▼
Route Handlers (src/app/api/**)        Pages / Server Components (src/app/**)
        │ withApi(): auth + CSRF origin      │ requireUser()/requireAdmin()
        │ Zod validation, rate limit         ▼
        ▼                             Services (src/services/**)
Services (src/services/**)  ◄─────────┘  business rules, ownership checks,
        │                             UsageService limits, transactions
        ▼
Repositories (src/repositories/**)     pagination + query logic only
        │
        ▼
Sequelize Models (src/models/**) ──► MySQL
Redis (src/config/redis.ts) ─ cache / rate limit / BullMQ queues
```

The Phase 2 crawler pipeline:

```
User → POST /api/projects/[id]/audits
        │ AuditService.startAudit()
        │   - authorize project (org-scoped, 404 on cross-org)
        │   - UsageService.enforceLimit(audits + crawled_pages)
        ▼
BullMQ queue (src/queues/crawlQueue.ts)      ← falls back to an inline crawl when Redis is down
        ▼
Worker (src/jobs/crawlWebsite.ts, npm run worker:crawl)
        ▼
AuditService.runCrawl(): BFS over same-site links
  ├─ robots.txt fetched + parsed (RFC 9309, crawl-delay honored)
  ├─ every fetch goes through safeFetch() (src/services/crawler/http-client.ts)
  │    ├─ SSRF: resolve DNS (A+AAAA), reject private/loopback/metadata/libcloud ranges
  │    ├─ connect DIRECTLY to the validated IP (closes DNS-rebinding / TOCTOU)
  │    └─ every redirect hop is re-validated before following
  ├─ Cheerio extraction → title/meta/canonical/robots/H1-H3/images/links/OG/Twitter/JSON-LD
  ├─ analyzePage() → SeoIssue rows (technical, metadata, content, images, performance)
  ├─ scorePage()/scoreSite() → deterministic 0-100 SEO + health scores
  └─ SiteAudit + Crawl + CrawlPage progress rows updated live
```

Rules enforced throughout:

- **UI never calls external SEO APIs** — provider interfaces live in `src/providers/**`
  (`KeywordProvider` with DataForSEO/Semrush/Ahrefs/SerpAPI swap-in design).
- **Never fabricate SEO metrics.** Mock providers return clearly-zero data and are isolated
  in `src/providers/keyword/mock-provider.ts`.
- **Never trust `projectId`/`organizationId` from the client** — authorization always resolves
  from the session; cross-org access returns 404 (existence is never revealed).
- **No business logic in React components.** Components render; services decide.

## 5. Project structure

```
src/
  app/
    (public)/          landing, pricing (SEO-optimized, JSON-LD, sitemap, robots)
    (auth)/            login, register, verify-email, forgot/reset password
    (dashboard)/       guarded app area: dashboard, projects, settings, billing, admin
    api/               route handlers (auth, account, projects, usage, search, ...)
  components/          ui/ (shadcn), dashboard/, forms/, charts/
  config/              env (zod-validated), database, redis, auth
  constants/           enums, plan seeds, audit actions
  database/            migrate.ts (Umzug), seed.ts, migrations/*.ts, helpers
  jobs/  queues/       placeholders — populated in Phase 2 (BullMQ)
  lib/                 api wrapper, session, errors, logger, crypto, password,
                       rate-limit, cache helpers, url normalization, usage math
  middleware.ts        edge cookie-presence redirects (UX only; real guard = layouts)
  models/              24 Sequelize models + association registry
  providers/keyword/   KeywordProvider interface + isolated mock
  repositories/        data access + pagination
  services/            AuthService, ProjectService, UsageService, ...
  types/ validators/   shared types, Zod schemas
```

## 6. Environment variables

All variables (from `.env.example`):

| Variable | Purpose |
| --- | --- |
| `APP_URL` | Absolute base URL (OAuth redirect, emails, canonical URLs) |
| `LOG_LEVEL` | `debug` \| `info` \| `warn` \| `error` |
| `DATABASE_HOST/PORT/NAME/USERNAME/PASSWORD/POOL_MAX` | MySQL |
| `REDIS_URL` | Redis for cache/rate-limit/queues |
| `AUTH_SECRET` | Long random string (required in production) |
| `AUTH_SESSION_TTL_DAYS` | Session lifetime (default 30) |
| `AUTH_REQUIRE_EMAIL_VERIFICATION` | `true` in production; `false` relaxes dev onboarding |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Enables "Sign in with Google" |
| `STRIPE_*`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Phase 9 billing |
| `PAGESPEED_API_KEY`, `DATAFORSEO_*`, `SERP_API_KEY` | Real SEO data providers (Phases 2/4/6) |
| `AI_API_KEY` | Phase 7 AI content |
| `SMTP_*` | Email delivery; unset = emails log to server console |
| `TEST_DATABASE_NAME` | Integration-test database |

Generate a strong secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

The app **fails fast** in production if `AUTH_SECRET` is left as the dev default.

## 7. Security model (Phase 1)

- Passwords hashed with **bcrypt (12 rounds)**; plaintext never stored or logged.
- **Sessions**: httpOnly `SameSite=Lax` cookie holds a random token; MySQL stores only its
  SHA-256 hash. Password reset/change revokes all other sessions.
- **CSRF**: same-origin enforcement on all mutating API requests + `SameSite=Lax` cookies.
- **Rate limiting**: Redis fixed-window (in-memory fallback) on login/register/reset flows.
- **Security headers** (CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy)
  applied globally via `next.config.ts`.
- **Email enumeration**: verification/reset endpoints always return success.
- **Audit log**: security-relevant events recorded in `audit_logs` (redacted, structured logging).
- **SSRF**: the Phase 2 crawler resolves DNS (A+AAAA) and rejects private/loopback/cloud-metadata
  ranges, connects directly to validated IPs (prevents DNS rebinding/TOCTOU), and re-validates
  every redirect hop. The app itself never fetches stored URLs outside the crawler.

## 8. Testing

```bash
npm run test
```

- **Unit**: usage-limit math, URL normalization, crypto tokens, password hashing, Zod
  validators, rate limiter semantics, robots.txt (RFC 9309), HTML extractor + analyzer,
  SEO scoring, SSRF classification (IPv4/IPv6/hostnames/IP literals).
- **Integration** (`src/__tests__/ownership.integration.test.ts`): proves a user **cannot**
  read/update/delete another organization's projects (404 masking), that each user gets an
  isolated organization, and that **plan limits come from the database** (free plan = 1 project).
  Requires migrations + seed; auto-skips when MySQL is unreachable.

## 9. Production build & deployment

```bash
npm run build
npm run start        # or run behind a reverse proxy / container
```

Checklist:

1. `NODE_ENV=production`, strong `AUTH_SECRET`, `AUTH_REQUIRE_EMAIL_VERIFICATION=true`.
2. MySQL reachable; run `npm run migrate && npm run db:seed` **on deploy** (idempotent seed).
3. Redis reachable (required in production for correct rate limiting + queue processing).
4. `APP_URL` must match the public URL (used for OAuth redirects + emails).
5. Worker processes deploy as separate services running the same image with a worker entrypoint:
   `npm run worker:crawl` (`src/jobs/worker.ts` → BullMQ crawl worker; shares env only).
6. `robots.ts`/`sitemap.ts` use `APP_URL`; private areas are `noindex` + disallowed.

## 10. Roadmap

- [x] **Phase 1 — Foundation**: Next.js/TS/Tailwind/shadcn, MySQL+Sequelize+migrations,
      auth (email/password + Google, verification, reset), users/organizations/projects,
      permissions, dashboard shell, project management, UsageService, API layer, admin stub
- [x] **Phase 2 — SEO Audit**: SSRF-hardened crawler (DNS-resolved blocking, redirect
      re-validation, direct-IP connects), robots.txt honoring, Redis+BullMQ queue with inline
      fallback, Cheerio page analyzer (technical/metadata/content/images/performance),
      deterministic SEO + health scoring, live audit progress + issues & pages APIs/UI
- [x] **Phase 3 — SEO Tools**: meta/SERP/schema/robots/sitemap generators, keyword density,
      redirect & broken-link checkers (client-side generators + SSRF-safe server checkers),
      rate-limited public APIs, indexable `/tools/[slug]` pages (SEO metadata + JSON-LD)
- [x] **Phase 4 — Keywords**: research via KeywordProvider, clustering, rank tracker + history
- [x] **Phase 5 — Competitors**: domain keywords via provider interface, overlap
      (common/missing/unique), Website-vs-competitors comparison, content-gap finder with
      volume/difficulty/intent filters, per-project `/competitors` UI
- [x] **Phase 6 — Backlinks**: BacklinkProvider interface (mock + DataForSEO), snapshot
      sync into MySQL, new/lost detection + notifications, referring domains, anchor
      distribution, backlink gap finder, per-project `/backlinks` UI, cross-tenant masking
- [ ] **Phase 7 — AI**: briefs, titles, outlines, FAQ (AIProvider abstraction)
- [ ] **Phase 8 — Reports**: PDF/CSV/Excel, white-label
- [ ] **Phase 9 — Billing**: Stripe checkout, webhooks, subscriptions
- [ ] **Phase 10 — Admin**: full admin panel, jobs, monitoring

## 11. License

Proprietary — all rights reserved.

