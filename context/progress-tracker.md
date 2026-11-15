# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase 0: Foundation. Go signal given on 2026-11-06.

## Current Goal

- Unit 0.6: Vercel deployment and a daily scheduled route protected by `CRON_SECRET`
  (`context/feature-specs/0.6-vercel-deployment-daily-cron.md`). Built and checked locally; next are
  the owner's approval to commit and push, the pull request into `main`, the Vercel project and the
  production checks.

## Completed

- Context files filled in from the three source documents and the approved plan.
- Unit 0.1: theme tokens, fonts and metadata
  (`context/feature-specs/0.1-theme-tokens-fonts-metadata.md`).
- Unit 0.2: shadcn/ui setup and responsive app shell
  (`context/feature-specs/0.2-shadcn-setup-app-shell.md`). Completed on 2026-11-12.
- Unit 0.3: Supabase projects, Prisma setup and connection strings
  (`context/feature-specs/0.3-supabase-projects-prisma-setup.md`). Completed on 2026-11-13, including
  the owner's production connection check.
- Unit 0.4: First migration with RLS, and the Prisma role's RLS behavior confirmed
  (`context/feature-specs/0.4-first-migration-rls.md`). Completed on 2026-11-13, with the migration
  applied to both projects.
- Unit 0.5: Vitest, Playwright, lint and build in CI
  (`context/feature-specs/0.5-vitest-playwright-ci.md`). Completed on 2026-11-15; CI passes on
  `development` (all three jobs, about 1 minute).

## In Progress

- Unit 0.6, built locally on 2026-11-15 and not committed yet. Lint, type check, 41 unit tests, the build
  and 16 Playwright tests pass, and an authorized call against the development database returned 200.
  A build with no `DATABASE_URL` fails on the heartbeat route, which confirms CI's placeholder is needed.
  Waiting for: the owner's approval to commit and push to `development`; CI; a pull request into `main`
  for the owner to merge; the owner creating the Vercel project (Manual Task 3); the production checks
  in step 8; and the first scheduled run.

## Next Up

Before Phase 0:

- [x] Owner installs the UI UX Pro Max skill.
- [x] Refine `ui-context.md` with the skill and the owner's reference images.
- [x] Owner gives the go signal for Phase 0.

### Release 1: Core Features

**Phase 0: Foundation**

- [x] Theme tokens, fonts and metadata cleanup in `app/`
- [x] shadcn/ui setup and responsive app shell
- [x] Supabase development and production projects, Prisma setup and connection strings
- [x] First migration with RLS; confirm the Prisma role's RLS behavior
- [x] Vitest, Playwright, lint and build in CI
- [ ] Vercel deployment and a daily scheduled route protected by `CRON_SECRET` (built; production checks pending)
- [ ] Documented `pg_dump` routine; confirm backup and project-pause behavior

**Phase 1: Auth and profiles**

- [ ] Email sign-up, log-in, log-out and password reset
- [ ] Google and Facebook sign-in
- [ ] Route protection through `proxy.ts`, plus server-side session helpers
- [ ] Authenticator-app 2FA, enforced for every sign-in method
- [ ] Profile with preferred currency and notification preferences

**Phase 2: Transactions**

- [ ] Money module, with amount and currency fields
- [ ] Transaction create, edit and delete
- [ ] Categories and tags
- [ ] Transaction history with date, category and tag filters
- [ ] Notes and receipt attachments in private storage

**Phase 3: Multi-currency**

- [ ] Exchange rate provider interface and Frankfurter adapter
- [ ] Daily rate sync into `fx_rates`
- [ ] Conversion and consolidated totals, with the rate date in the UI

**Phase 4: Recurring transactions**

- [ ] Recurring rule create, edit and delete
- [ ] Idempotent daily posting job

**Phase 5: Dashboard**

- [ ] Summary metrics for income, expenses, savings and investments
- [ ] Spending and income trend charts

**Phase 6: Budgets and alerts**

- [ ] Budget create, edit and delete, with usage indicators
- [ ] Notifications table and in-app notification center
- [ ] Budget alerts and significant-transaction alerts
- [ ] Budget summary on the dashboard

**Phase 7: Goals**

- [ ] Goals with targets, deadlines and progress bars
- [ ] Milestones
- [ ] Goal summary on the dashboard

**Phase 8: Reports**

- [ ] Spending, income source and trend reports
- [ ] Filters by date range, category and tag
- [ ] Income versus expense comparison
- [ ] CSV, Excel and PDF export

**Phase 9: Investments**

- [ ] Portfolio and investment transactions, with manual updates
- [ ] ROI, growth trends and performance summary
- [ ] Investment total on the dashboard

**Phase 10: Debts**

- [ ] Debts and payments, with balances, rates and due dates
- [ ] Avalanche and snowball payoff calculators

**Phase 11: Auto-categorization**

- [ ] User-defined rules
- [ ] Matching with earlier merchants or notes

**Phase 12: Security and privacy**

- [ ] Privacy settings
- [ ] Full data download and account deletion
- [ ] Security checklist and dependency scanning

### Release 2: Features to Add

- [ ] **Phase 13: Data portability** — Full data export, and CSV import with preview and
      duplicate detection
- [ ] **Phase 14: Customization** — Dashboard layout, custom categories, themes and regional
      formats
- [ ] **Phase 15: Mobile** — PWA and push notifications
- [ ] **Phase 16: Help center** — FAQs and tutorials
- [ ] **Phase 17: Bank linking** — Parked until a country is chosen
- [ ] **Phase 18: Tax** — Parked until a country is chosen

## Open Questions

**Before the relevant phase**

- Phase 1: What goes in the sign-in panel's illustration slot? The reference only shows a
  placeholder. Proposed: one simple line illustration.

- Phase 2: Which currencies does the owner need? Frankfurter covers about 30, and any others
  would need manual rates or a different provider.
- Phase 1: Does sign-in work with the Supabase Data API turned off? Supabase's docs don't say Auth
  needs it, but they don't say it outright either. If it doesn't, turn it back on; the missing grants
  and RLS still block data access.
- Phase 1: Schema naming conventions (model and table names, ID type, timestamp types). Owner's
  decision on 2026-11-13 to decide them with the first application table.
- Phase 3: Which rate applies to dates with no published rate? Proposed: the most recent
  earlier rate.
- Phase 4: Which frequencies do recurring rules support? Proposed: weekly, every two weeks,
  monthly and yearly.
- Phase 6: Which budget periods are supported? Proposed: monthly.
- Phase 6: At what usage does "nearing a budget" begin? Proposed: 80%.
- Phase 6: What is the default significant-transaction amount?
- Phase 9: Should investment prices ever come from a price feed? Default: manual entry only.
- Phase 12: What should privacy settings control, given that no data is shared with anyone?
- Phases 17 and 18: Which country or region applies? This decides the bank provider and the
  tax rules.

## Architecture Decisions

- **Next.js Server Actions and Route Handlers as the backend:** No separate API server to run,
  and it meets the Functional Design's Node.js requirement.
- **Supabase for database, auth and files:** One free vendor covers all three, with free
  authenticator-app 2FA. Clerk's MFA appears to need a paid plan.
- **Prisma as the ORM:** The owner wants to practice with it. Complex reports use `$queryRaw`.
- **English only:** Owner's decision, so no translation layer. Regional formats still use
  `Intl`, because the docs ask for them and they cost almost nothing.
- **Personal project on free tiers:** Owner's decision. No paid plans, formal audits or Sentry.
- **In-app alerts first:** Resend needs a verified domain, which likely means buying one. Email
  alerts stay optional.
- **Daily exchange rates with the rate date shown:** Owner's decision. Free and fits Vercel
  Hobby's daily cron, though it doesn't meet the documents' literal "real-time" wording.
- **Rates in a dated table, with original amounts on transactions:** Changing the preferred
  currency never rewrites history.
- **TLS plus encryption at rest, not end-to-end encryption:** End-to-end encryption would stop
  the server computing reports, alerts and auto-categorization.
- **Email, Google and Facebook sign-in only:** Owner's decision. Phone sign-in is out of scope,
  which also avoids SMS costs.
- **Responsive web and PWA, not a native app:** Meets the mobile and push requirements with one
  codebase.
- **Minimalist, monochrome theme based on the owner's reference images:** Owner's decision,
  recorded in `ui-context.md`. Slate and near-black replace the earlier teal accent draft. Dark mode
  is derived, as the references show light mode only.
- **Next's agent file settings are off:** Owner's decision. `agentRules` is `false` and
  `experimental.agentFeedback` is removed, so `next dev` doesn't re-create `AGENTS.md`.
- **Two free Supabase projects:** Owner's decision. Development takes `migrate dev` and test data,
  so production holds real data and only receives `migrate deploy`. Needs no Docker.
- **`.claude` is the only agent folder:** Owner's decision. Project instructions live in
  `CLAUDE.md`, and the UI UX Pro Max skill lives in `.claude/skills/ui-ux-pro-max`. Do not add
  `.agents/`. The Next.js docs rule from the starter's `AGENTS.md` is kept in `code-standards.md`.
- **shadcn variables point at FinTrack tokens:** One mapping block in `globals.css`, so dark mode
  follows the system with no second copy. shadcn's `--radius-*` overrides are removed, so Tailwind's
  radius classes keep their standard sizes.
- **`/dashboard` route, with `/` redirecting to it:** Matches the "Home / Dashboard" breadcrumb, and
  leaves `/` free for Phase 1's signed-out behavior.
- **Placeholder pages for every nav item:** No navigation link leads to a 404. Each feature's unit
  replaces its placeholder.
- **Text wordmark as the logo:** Until a logo file exists.
- **No sidebar state cookie:** Reading it would make every page dynamic under `cacheComponents`.
- **shadcn's `cn` package:** shadcn CLI 4.23 installs `cn` in place of `clsx` and `tailwind-merge`, and
  it was kept as generated.
- **Prisma 7.10.1, not Prisma 8:** Prisma 8 is still a release candidate, and the `prisma` npm `latest`
  tag points at `8.0.0-rc.33`. Upgrade in its own unit once Prisma 8 is stable.
- **Dedicated `prisma` database role with `BYPASSRLS`:** as Supabase's Prisma guide recommends. Its own
  password can be rotated without touching `postgres`.
- **Transaction pooler at runtime, session pooler for migrations:** Vercel functions are serverless, and
  the direct connection is IPv6-only on the free plan.
- **Development strings only in `.env.local`:** production strings live in Vercel and the owner's
  password manager, so no local command reaches production by accident.
- **`@next/env` loads env files for the Prisma CLI:** same files and precedence as `next dev`, and unit 0.5
  reuses it for Vitest. No `dotenv`.
- **Generated Prisma Client in `lib/db/generated/`:** keeps every Prisma import under `lib/db/`
  (invariant 3).
- **No `server-only` package:** Next.js 16 handles `import "server-only"` itself and ships its types.
- **First migration has no application table:** owner's decision. `init` only enables RLS on
  `_prisma_migrations`. `profiles` waits until Phase 1 defines its fields.
- **Supabase Data API off in both projects:** owner's decision on 2026-11-13. Only Prisma reads the
  database, so it removes unused surface behind RLS.
- **Owner applies production migrations by hand:** `migrate status`, then `migrate deploy`, with
  `DIRECT_URL` set for one command. The routine is in `architecture.md`. Vercel's build never runs
  migrations and has no `DIRECT_URL` (unit 0.6).

- **Database tests only on CI's throwaway Postgres 17:** owner's decision on 2026-11-15. No secrets in
  GitHub, Supabase data is never touched, and migrations are proven on an empty database. No local
  database tests; `tests/db/setup.ts` refuses Supabase hosts. Supabase's `anon`/`authenticated` grant
  checks stay manual (Security Advisor).
- **Public GitHub repository:** free, unlimited Actions minutes, so all CI jobs run on every push to
  `development` and `main`, on pull requests into `main`, and by hand.
- **Two Vitest projects (`unit`, `db`) and Chromium-only Playwright at desktop and phone width.**
- **`@types/node` 24:** matches the Node 24 runtime (`.nvmrc`), and Vitest 5 requires 22 or later.
- **Vercel Hobby, `main` to production, previews off:** owner's decision on 2026-11-15. Functions in
  `syd1` next to Supabase, Node 24 through `engines.node` (Vercel's default is now 26.x). No custom domain.
- **Vercel Schedules instead of Cron Jobs:** owner's decision on 2026-11-15. Cron Jobs are legacy;
  Schedules are in beta, so the route uses a plain path target with `CRON_SECRET` and depends on nothing
  beta. Private function targets are reconsidered in Phase 3.
- **One scheduled route per job, `POST` only:** the first is `heartbeat`, 03:00 `Asia/Singapore`, a
  read-only `SELECT 1`. Rates and recurring posting get their own schedules and times.
- **Constant-time `CRON_SECRET` check that fails closed:** `lib/cron/authorize.ts`.
- **Placeholder `DATABASE_URL` in CI builds:** `lib/db/client.ts` stays eager; nothing connects to it.

## Session Notes

- Unit 0.6 (2026-11-15): Vercel's default Node.js is 26.x, with 24.x and 22.x available, so
  `engines.node: "24.x"` pins it. Owner's time zone is `Asia/Singapore` (no daylight saving time).
- For Phase 1: `proxy.ts` must leave `/api/cron/*` alone, and the production `*.vercel.app` URL must be
  added to Supabase Auth and the Google and Facebook apps.

- Stack and scope were chosen on 2026-11-05. Unit 0.2 added the shadcn/ui dependencies on
  2026-11-12. Unit 0.3 added Prisma 7.10.1 on 2026-11-13.
- Playwright is set up (unit 0.5): browser checks use `npm run test:e2e` after `npm run build`. The
  earlier `playwright-core`-from-the-scratchpad workaround is no longer needed.
- Units 0.1 and 0.2 were committed and pushed to `main` on GitHub (`DarylRamos/fintrack`) on
  2026-11-12. Source `.docx` documents are git-ignored.
- Units 0.3 and 0.4 were committed together (`3b738dc`) and pushed to the `development` branch on
  2026-11-13, at the owner's request. `main` is unchanged, and work now happens on `development`.
- `git status` already showed uncommitted starter changes before this work (deleted `public/`
  assets; edits to `app/globals.css` and `app/page.tsx`).
- Prices and free-tier limits came from web searches on 2026-11-05. Recheck them before relying
  on them.
- Prisma 8 is not stable yet: on 2026-11-13, the `prisma` npm `latest` tag pointed at `8.0.0-rc.33`,
  while `@prisma/client` and `@prisma/adapter-pg` were at 7.10.1. The project uses 7.10.1. Follow the
  docs for the installed version, and ignore the CLI's "update to latest" banner.
- Supabase free plan (checked 2026-11-13): two active projects are allowed, and projects with low
  activity over 7 days are paused and must be restored by hand. Whether the daily job counts as
  activity stays open until unit 0.7.
- Both Supabase projects are in `ap-southeast-2` (Sydney), and both were active at the same time on
  2026-11-13.
- Production CLI checks can't tell the projects apart from the output, because both use the same
  regional pooler host. Check that the pasted string's user is `prisma.<prod-ref>` first.
- npm 11's allow-scripts guard skipped the install scripts of `prisma` and `@prisma/engines`. The CLI
  and schema engine work without them, so they weren't approved. The project's own `postinstall`
  (`prisma generate`) is not affected.
- Unit 0.4 (2026-11-13): `prisma` has `rolbypassrls = true` and can insert and read under forced RLS
  with no policies. Tables it creates give `anon` and `authenticated` no grants. Security Advisor's Info
  item "RLS enabled, but no policies exist" is expected on every table.
- The owner's terminal is Git Bash. PowerShell's `$env:` syntax fails there and the Prisma CLI silently
  falls back to `.env.local` (development). The first production attempt in unit 0.4 hit development
  this way; the Bash routine in `architecture.md` fixed it.
- Unit 0.5 (2026-11-15): `npm audit` reports 12 low and moderate issues in existing packages (`shadcn`
  and the ESLint/TypeScript chain), none from Vitest or Playwright. Left for Phase 12.
- Unit 0.5 (2026-11-15): the first CI run failed at `typecheck` because `LayoutProps` and `next-env.d.ts`
  are generated and git-ignored. `typecheck` now runs `next typegen` first. Commits `8188483` and
  `1804d93` are on `development`; `main` is unchanged.
