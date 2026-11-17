# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase 1: Auth and profiles. Phase 0 (Foundation, go signal 2026-11-06) is complete.

## Current Goal

- Unit 1.1a: email sign-up, sign-in, sign-out and password reset
  (`context/feature-specs/1.1a-email-sign-up-sign-in-password-reset.md`). Code and automated tests are
  done, including the approved email-link amendment and the hand-check fixes; the development hand
  checks pass. Committed with unit 1.1b (`96a498d`); CI passed. Production checks wait
  for the combined merge of units 1.1a to 1.3 (see Architecture Decisions).
- Unit 1.1b: a re-clicked reset link opens "Set a new password" in the same browser for up to 1 hour,
  until the password is changed or the browser signs out
  (`context/feature-specs/1.1b-reset-link-reclick.md`). Built, and the development hand checks pass.
- Unit 1.2a: route protection through `proxy.ts`, plus `requireUser()`
  (`context/feature-specs/1.2a-route-protection-session-helpers.md`). Built on 2026-11-17; automated
  tests and the development hand checks pass. Committed to `development`. Production checks wait for the
  combined merge of units 1.1a to 1.3.
- Unit 1.2b: custom HTTP error pages, 404 (`app/not-found.tsx`) and 500 (`app/error.tsx` and
  `app/global-error.tsx`). Spec not written yet; it follows unit 1.2a.

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
- Unit 0.7: documented `pg_dump` routine, backup and pause behavior
  (`context/feature-specs/0.7-backup-routine-pause-behavior.md`). Completed on 2026-11-16 and not
  committed with 0.6 (see below). The agent's rehearsal on development passed. The owner's first
  production backup passed every check: both files, the list check, 1 migration row, and the auth file.
- Unit 0.6: Vercel deployment and a daily scheduled route protected by `CRON_SECRET`
  (`context/feature-specs/0.6-vercel-deployment-daily-cron.md`). Completed on 2026-11-16.
  - Production is at `https://fintrack-kappa-blush.vercel.app`, with functions in `syd1` on Node 24.
  - `heartbeat`: Run Schedule and the first scheduled run (2026-11-16, 03:00 `Asia/Singapore`) both
    returned 200.
  - `DATABASE_URL` and `CRON_SECRET` are the Secret type, Production only.
  - No preview was built for `development`, checked on the combined push.
- Units 0.6 and 0.7 were committed together as `e4b24f5` on `development`; CI run 43779418698 passed.
  Pull request #4 merged them into `main` as `4da9f11` on 2026-11-16, and CI passed on `main` (run
  43781364587).

## In Progress

- **Unit 1.1a** (spec approved 2026-11-16). Done:
  - Dependencies, pinned: `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.119.0, `zod` 4.6.7,
    `react-hook-form` 7.92.0, `@hookform/resolvers` 7.0.6; shadcn `field`, `label`, `dropdown-menu`.
  - `proxy.ts` (session refresh only), `lib/auth/*`, `lib/validation/auth.ts`, the `(auth)` pages and
    Server Actions, `app/auth/confirm`, and the header's user menu.
  - `npm run lint`, `npm run typecheck`, `npm test` (155 tests, 114 new) and `npm run build` pass;
    `npm run test:e2e` passes (48 passed, 14 skipped; 34 new).
  - Email-link amendment (approved 2026-11-16): Supabase's templates are locked on the free plan with
    built-in email, so the owner chose option A. The actions pass a `/auth/confirm` redirect built from
    the request's origin, and `/auth/confirm` also exchanges the default templates' PKCE `code`. The
    check-email and auth-error pages explain the same-browser limit.
  - Hand-check fix (2026-11-16): "Forgot password?" needed two clicks, because a field error appearing on
    blur shifted the centred form. The auth forms now check fields on submit, then as the user types.
  - Hand-check fixes A and C (approved 2026-11-16): `getCurrentClaims()` awaits `io()` before
    `getClaims()`, fixing the "Blocking Route: `Date.now()`" error on signed-in pages; the user menu
    moved from each page header into the app layout, so it stays mounted across navigations; the
    sign-up check-email message no longer claims an email was sent. Lint, typecheck, 155 unit tests,
    build and Playwright (48 passed, 14 skipped) pass.
  - Hand checks 10.2.1 to 10.2.6 pass (2026-11-16); 10.2.7 to 10.2.10 pass (2026-11-17), and the owner
    confirmed fix A (no `Date.now()` overlay while signed in). Sign-in works with the Data API off.
  - The owner added the Redirect URLs in both projects (spec Manual Task 2).
  - The owner set both projects' Site URL and email settings (password rule: 8+ characters, lowercase,
    uppercase and digit), added the Supabase variables to `.env.local` and to Vercel (Production only),
    and reported ECC JWT signing keys in both projects.

  - Committed with unit 1.1b as `96a498d` on `development` (owner's choice on 2026-11-17: one commit for
    both units). CI run 44022765106 passed (all three jobs).

  Remaining:
  - The production hand checks (spec step 10.3) after units 1.1a to 1.3 are merged into `main` together.

- **Unit 1.1b** (spec approved 2026-11-17 with the defaults: clear the cookie on sign-out; no new
  check-email wording). Done:
  - `lib/auth/reset-pending.ts` (the `fintrack-reset-pending` cookie, 1 hour); `requestPasswordReset`
    sets it on every path to the check-email page; `updatePassword` (on success) and `signOut` clear it;
    `/auth/confirm` sends a used reset link to `/reset-password` only with the cookie, a session and
    `next=/reset-password`.
  - `npm test` 175 passed (20 new); lint, typecheck and build pass; Playwright 48 passed, 14 skipped.
  - Docs: `architecture.md`, `code-standards.md`, the 1.1a spec's Notes.

  - The owner confirmed Email OTP Expiration is 3600 seconds in both projects. Hand checks 5.2 to 5.4
    pass; 5.1 opened the reset page (so Supabase keeps `next`), but the URL kept Supabase's
    `#error=…` fragment.
  - Hand-check fix (approved 2026-11-17): `components/auth/clear-auth-error-hash.tsx`, in the auth
    layout, removes Supabase's error fragment from the URL. Playwright 56 passed, 14 skipped.

  - After the fix, the owner repeated 5.1 (plain `/reset-password` URL) and 5.2 (plain `/auth-error` URL):
    both pass (2026-11-17).

  - Committed with 1.1a as `96a498d`; CI run 44022765106 passed.

  Remaining:
  - The production check (repeat 5.1) after units 1.1a to 1.3 are merged into `main` together.

- **Unit 1.2a** (spec approved 2026-11-17 with the defaults: return to the requested page; signed-in
  browser tests with a development test account, local only; remove the header's signed-out link).
  Done:
  - `lib/auth/paths.ts` and `routes.ts` (the route rules, `routeDecision`); `proxy-session.ts` reports
    `signedIn` and builds redirects that keep refreshed cookies; `proxy.ts` applies the rules.
  - `safeReturnPath` in `redirect.ts`; `signIn` returns to it; the sign-in form sends the URL's `next`
    at submit time (so `/sign-in` stays static).
  - `requireUser()` in `session.ts`; `AccountArea` uses it; the header's "Sign in" link is gone and its
    padding is `pr-14`.
  - Tests: `npm test` 284 passed; lint, typecheck and build pass. Playwright on port 3100 with the
    owner's development test account: 92 passed, 15 skipped. In CI the signed-in tests skip.
  - Docs: `architecture.md`, `code-standards.md`, `ui-context.md`, the 1.1a and 1.1b specs' Notes.

  - The owner ran the browser tests (92 passed, 15 skipped) and `npm test` locally, and hand checks 6.1
    to 6.7 pass (2026-11-17).
  - Committed to `development` at the owner's request (2026-11-17).

  Remaining:
  - CI on `development`, then the production checks (6.1 to 6.6) after units 1.1a to 1.3 are merged
    into `main` together.

- **Follow-up, on or after 2026-11-23:** the owner confirms production is still active, not paused, after
  7 or more daily heartbeats, and that no Supabase pause email has arrived. If it paused: restore it,
  record it, and open a small unit to make the heartbeat more realistic or more frequent.

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
- [x] Vercel deployment and a daily scheduled route protected by `CRON_SECRET`
- [x] Documented `pg_dump` routine; confirm backup and project-pause behavior (pause check on or after 2026-11-23)

Phase 0 follow-ups for Phase 2 (from unit 0.7):

- [ ] A Storage backup routine for receipts. Database dumps don't include Storage files.
- [ ] A full restore drill, into the development project or a throwaway local Postgres 17 server.
- [ ] Decide on a second, off-machine copy of the backups.

**Phase 1: Auth and profiles**

- [ ] Email sign-up, log-in, log-out and password reset (unit 1.1a: development checks pass; committed
      with 1.1b; production checks pending)
- [ ] Reset link works again in the same browser until the password changes or 1 hour passes (unit
      1.1b, `context/feature-specs/1.1b-reset-link-reclick.md`: development checks pass; committed with
      1.1a; production check pending)
- [ ] Route protection through `proxy.ts`, plus server-side session helpers (unit 1.2a,
      `context/feature-specs/1.2a-route-protection-session-helpers.md`: development checks pass;
      committed; production checks pending)
- [ ] Custom 404 and 500 error pages (unit 1.2b; spec not written yet)
- [ ] Google and Facebook sign-in (unit 1.3)
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

- Phase 2: Which currencies does the owner need? Frankfurter covers about 30, and any others
  would need manual rates or a different provider.
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
- **Manual `pg_dump` backups, not `supabase db dump`:** no Docker, and the client tools were already
  installed. The routine uses the `postgres` role over the session pooler, so the `auth` rows are
  included. It makes two files, each encrypted with `gpg` (AES-256) as it is written, stored outside the
  project folder (unit 0.7).
- **Backups monthly and before every production migration:** owner's decision on 2026-11-16. The lighter
  option; the worst case is about a month of re-entry. Keep 12 monthly backups. No off-machine copy yet.
- **No backups through CI or Vercel:** the repository is public with no secrets, and Vercel functions
  have no `pg_dump`.

- **Sign-in panel illustration:** owner's choice in unit 1.1a. A simple inline SVG line drawing (a rising
  line chart beside a small stack of coins), in `--text-on-inverse-muted`. Closes the open question.
- **Units 1.2 and 1.3 swapped; 1.1a to 1.3 reach production together:** owner's decision on
  2026-11-17. Unit 1.2 is now route protection (it was 1.3) and unit 1.3 is Google and Facebook sign-in
  (it was 1.2), so pages are protected before more sign-in methods arrive. Units 1.1a, 1.2 and 1.3 are
  built and pushed to `development` one at a time (CI on each push; `development` doesn't deploy), then
  merged into `main` in one pull request, followed by one production check session grouped by unit. The
  public site never shows sign-in without page protection. Each unit keeps its own commit, so a
  production failure points to its unit.
- **`/` is the entry point, by redirect (Option A):** owner's decision on 2026-11-17. Signed out, `/`
  goes to `/sign-in`; signed in, to `/dashboard`. The sign-in and sign-up pages keep their own URLs.
  Showing the sign-in form at `/` itself (Option B) was turned down: it would have reworked unit
  1.1a's pages and links for no change in what users can do.
- **Unit 1.2 renamed 1.2a; unit 1.2b added:** owner's decision on 2026-11-17. 1.2b adds custom 404 and
  500 pages as a separate small unit (error pages are UI, route protection is auth), released with
  units 1.1a to 1.3. 401 and 403 pages aren't planned: the proxy sends signed-out visitors to sign-in,
  and another user's record answers 404 so its existence isn't revealed. The spec file is now
  `context/feature-specs/1.2a-route-protection-session-helpers.md`.
- **Signed-in browser tests use a development test account, local only:** owner's decision on
  2026-11-17 (unit 1.2a, Question B). `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` live in `.env.local`
  only, never in Vercel or GitHub; CI skips the signed-in tests. Revisit with the decision on Supabase's
  local stack in CI, before unit 1.4.
- **Unit 1.1 renamed 1.1a; unit 1.1b added:** owner's decision on 2026-11-17. 1.1b (reset link
  re-click, with a cookie rather than a database table) is a separate small unit, so 1.1a stays closed
  with its checks passed. It ships in the same combined release as 1.1a to 1.3. The spec file is now
  `context/feature-specs/1.1a-email-sign-up-sign-in-password-reset.md`.
- **`proxy.ts` arrives in unit 1.1a, for session refresh only:** owner's decision on 2026-11-16. Supabase
  needs it to refresh expired access tokens; redirects stay in unit 1.2.
- **Every auth step is a Server Action; no browser Supabase client:** the session cookies are written
  by the server, and each action is validated like any public endpoint.
- **Default email templates with PKCE `code` links (amended 2026-11-16, option A):** the planned
  token-hash links need custom templates, which the free plan locks with built-in email. PKCE links need
  the same browser, which suits a single owner. `/auth/confirm` handles both, so custom SMTP can switch
  to token-hash links later with no code change. The actions set a fixed `next`, Supabase's Redirect
  URLs limit the origin, and `safeNextPath` limits the path. Custom SMTP (owner's Gmail) was not chosen
  because email would then reach strangers, and Pro is paid.
- **Password rule enforced by Supabase and mirrored in Zod:** owner's decision on 2026-11-16, at least 8
  characters with lowercase, uppercase and a digit. The owner first asked for "a digit or symbol", but
  Supabase can't enforce that, which would have left a gap for callers that bypass the app.
- **Sign-ups stay on in both projects:** owner's decision on 2026-11-16. Built-in email only reaches
  organisation members, so strangers can't confirm an account.
- **Real auth flow checked by hand for now:** owner's decision on 2026-11-16. Playwright covers pages,
  validation and redirects. Decide before unit 1.4 whether to run Supabase's local stack in CI.

## Session Notes

- Unit 0.6 (2026-11-15): Vercel's default Node.js is 26.x, with 24.x and 22.x available, so
  `engines.node: "24.x"` pins it. Owner's time zone is `Asia/Singapore` (no daylight saving time).
- Production `_prisma_migrations` ownership and grants: **fixed and confirmed on 2026-11-16**.
  - **The problem:** the table was owned by `postgres`, and `anon`, `authenticated` and `service_role` had
    every privilege on it. Most likely unit 0.4's `migrate deploy` used the `postgres` string.
  - **Why no exposure:** the Data API is off, and RLS is on with no policies.
  - **The fix, run by the owner in the production SQL Editor:**
    - the pre-check passed (`postgres` is a member of `prisma`);
    - `alter table public._prisma_migrations owner to prisma;`
    - `revoke all on table public._prisma_migrations from anon, authenticated, service_role;`
  - **Confirmed:** the owner is `prisma`, and only `prisma` has grants.
  - **Also confirmed:** `relforcerowsecurity` is `false` in both projects. That is expected: `init` only
    enables RLS, and code-standards forbids forcing it.
  - **Confirmed:** `relrowsecurity` is `true` in production. Production now matches development: owner
    `prisma`, grants for `prisma` only, RLS on and not forced.
- Backups: the owner runs the routine in `architecture.md` → Backups on the 1st of each month, from
  2026-12-01, and before every production `migrate deploy`.
- For Phase 1: `proxy.ts` must leave `/api/cron/*` alone (its matcher does, since unit 1.1a), and the
  production `*.vercel.app` URL must be added to Supabase Auth (done as the Site URL in unit 1.1a) and the
  Google and Facebook apps (unit 1.3).
- Unit 1.1a (2026-11-16): `next build` inlines `NEXT_PUBLIC_` values, so a local `npm run build` uses
  `.env.local`'s development project, while CI uses unreachable placeholders. The e2e sign-in error test
  accepts either outcome. The 12 `npm audit` issues are unchanged (left for Phase 12).
- Unit 1.1a: Supabase's default email link lifetime is 1 hour, not 24, so the check-email page states no
  duration.

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
  activity over 7 days are paused and must be restored by hand. Whether the daily heartbeat counts as
  activity is checked on or after 2026-11-23 (see In Progress).
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
