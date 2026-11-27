# Architecture Context

## Stack

| Layer              | Technology                                 | Role                                                   |
| ------------------ | ------------------------------------------ | ------------------------------------------------------ |
| Framework          | Next.js 16 + React 19 + TypeScript         | Frontend, routing and server rendering                 |
| Backend            | Server Actions and Route Handlers          | Mutations, cron endpoints and file exports             |
| UI                 | Tailwind v4 + shadcn/ui + Lucide           | Styling, accessible components and icons               |
| Database           | PostgreSQL on Supabase (Free)              | All relational application data                        |
| ORM                | Prisma 7 + Prisma Migrate, `pg` adapter    | Schema, typed queries and migrations                   |
| Auth               | Supabase Auth                              | Email and Google sign-in; authenticator 2FA            |
| File storage       | Supabase Storage (private bucket)          | Receipts and invoices                                  |
| Validation, forms  | Zod + React Hook Form                      | Shared validation schemas and form state               |
| Charts             | Recharts (through shadcn charts)           | Dashboard and report charts                            |
| Tables             | TanStack Table                             | Transaction history sorting and filtering              |
| Exchange rates     | Frankfurter (behind a provider interface)  | Current and historical daily rates; no API key         |
| Scheduled jobs     | Vercel Schedules (path targets)            | Daily heartbeat, rate sync and recurring posting       |
| Notifications      | In-app; Web Push in Release 2              | Budget and significant-transaction alerts              |
| Exports            | Papa Parse, ExcelJS, react-pdf             | CSV, Excel and PDF generation                          |
| Formatting         | Native `Intl`                              | Regional date, number and currency display             |
| Testing            | Vitest + Playwright                        | Unit, end-to-end and cross-user access tests           |
| Hosting            | Vercel Hobby                               | Deployment for a personal, non-commercial project      |

Bank linking has no selected provider until a country is chosen. Email alerts are
optional and need a verified domain, which also means a sending service such as
Resend.

## System Boundaries

- `app/(auth)` — Sign-in, sign-up, check-email, forgot-password, reset-password, auth-error and
  two-factor (`/two-factor`, unit 1.4) pages, plus their Server Actions in `app/(auth)/actions.ts`.
- `app/auth/confirm` — The Route Handler for email links (sign-up confirmation and password reset),
  exchanging the default templates' PKCE `code`, or a token hash if custom templates are used (unit 1.1a).
- `app/auth/callback` — The Route Handler where Google sign-in returns (unit 1.3): exchanges the PKCE
  `code`, then goes to `safeReturnPath(next)` (or `/two-factor?next=…` with 2FA on, unit 1.4); every
  failure goes to `/sign-in?error=google`.
- `proxy.ts` — Refreshes the Supabase session on every page request (unit 1.1a), then applies the
  route rules in `lib/auth/routes.ts` (unit 1.2a): `/` goes to `/sign-in` or `/dashboard`; signed-out
  visits to any other page except the public ones go to `/sign-in?next=<page>`; signed-in visits to the
  guest pages go to the dashboard; a browser that still owes its 2FA code goes to `/two-factor` (unit
  1.4). Only `GET` and `HEAD` are redirected. Its matcher leaves out `/api/cron/*`, `_next` assets and
  image files.
- `app/(app)/<feature>` — Authenticated pages, plus each feature's Server Actions. `app/(app)/settings`
  holds the Security section (2FA on and off, unit 1.4) and its actions in `actions.ts`.
  `app/(app)/profile` holds the display name and preferred currency, saved by `updateProfile` in
  `actions.ts` (unit 1.5). `app/(app)/transactions` (unit 2.2) holds the list (`page.tsx`), `new/` and
  `[id]/edit/`, and the `createTransaction`, `updateTransaction` and `deleteTransaction` actions in
  `actions.ts`, which redirect to `/transactions?done=added|updated|deleted` on success.
- `app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx` — The 404 and error pages (unit 1.2b),
  standalone (no sidebar) and built on `components/status-page`. Unmatched URLs answer `404`; signed-out
  visits to unknown app paths still go to sign-in first. The error pages show only the error's `digest`
  as a reference, never its message. `app/fonts.ts` holds the font definitions shared by the root layout
  and `global-error.tsx`. The in-shell versions, `app/(app)/error.tsx` and `app/(app)/not-found.tsx` (unit
  2.2), keep the sidebar: the 404 shows for `notFound()` inside app pages (a missing or another user's
  transaction), while unmatched URLs keep the standalone page. A `notFound()` inside a streamed `Suspense`
  boundary answers `200` with the 404 content and `noindex` (Next.js: the status is sent before streaming
  starts).
- `app/api/cron` — Scheduled job routes, one per job, each run by its own schedule in `vercel.json`.
  The first is `heartbeat` (unit 0.6). Each checks `CRON_SECRET` through `lib/cron`.
- `components/ui` — Generated shadcn/ui components.
- `components/<feature>` — Feature-specific components.
- `lib/db` — Prisma Client and all database access. Server-only. The shared client is
  `lib/db/client.ts`, and the generated client is in `lib/db/generated/` (git-ignored). One module per
  table: `profiles.ts` (`getProfile`, `saveProfile`, unit 1.5) is the only code that touches `profiles`;
  `transactions.ts` (`listRecentTransactions`, `getTransaction`, `createTransaction`, `updateTransaction`,
  `deleteTransaction`, unit 2.2) the only code that touches `transactions`.
- `lib/actions` — `result.ts` (unit 2.2): the data actions' shared result shape (`ActionResult`,
  `failure`) and `logActionError` (only an error's name and Prisma code). No secrets, not server-only.
- `lib/dates.ts` — `formatCalendarDate` ("27 Nov 2026", unit 2.2). No secrets.
- `lib/auth` — Session, ownership and 2FA checks. `server.ts` creates the per-request Supabase client
  (cookie `getAll`/`setAll`, plus `cookie-options.ts` for the `Secure` flag), `proxy-session.ts` is the proxy's refresh and session-keeping redirect,
  `session.ts` has `getCurrentClaims()`, `getSessionStatus()`, `requireUser()`, `getSignedInUser()` and
  `getTwoFactorStatus()`, and `env.ts` reads the two public Supabase
  variables; these are server-only. `errors.ts` (error codes and messages), `redirect.ts` (the email
  link's `next` allowlist and the sign-in `safeReturnPath`), `paths.ts` (the public page lists) and
  `routes.ts` (the proxy's route rules, `routeDecision`) hold no secrets and import nothing server-only,
  so they are unit-testable and shared. `redirect.ts` also builds the Google sign-in return URL
  (`oauthRedirectUrl`, unit 1.3) and the 2FA step's URL and `next` (`twoFactorPath`,
  `safeTwoFactorNext`, unit 1.4). `assurance.ts` (unit 1.4) works out the session state (`signed-out`,
  `needs-2fa`, `signed-in`) for both the proxy and `session.ts`.
- `lib/validation` — Zod schemas shared by forms (browser) and Server Actions (server), such as
  `auth.ts`, `money.ts` and `transaction.ts` (unit 2.2). No secrets, and not server-only.
- `lib/cron` — The `CRON_SECRET` bearer check shared by every scheduled route. Server-only.
- `lib/money` — All decimal arithmetic, conversion and money formatting. Since unit 1.5 it holds
  `currencies.ts`: the supported currency codes (Frankfurter's 30, a fixed list), `DEFAULT_CURRENCY`
  (USD) and English names from `Intl.DisplayNames`. No database code, so forms share it. Unit 2.1 added
  each currency's decimal places (`CURRENCY_DECIMALS`: 0 for HUF, IDR, ISK, JPY and KRW, 2 for the rest, as
  `Intl` shows them, fixed in the app), `amount.ts` (`parseAmountInput`, string work only, and
  `isCanonicalAmount`) and `format.ts` (`formatMoney`, fixed `en-US` locale). There is no decimal library
  yet: nothing in Phase 2 does arithmetic; Phase 3's conversion picks one (likely `decimal.js`).
- `components/transactions` — The list, the transaction form and its type control, the delete dialog and
  the status line (unit 2.2).
- `components/money` — The Amount and Currency fields (`money-fields.tsx`, unit 2.1) for any form whose
  schema uses `moneyShape` from `lib/validation/money.ts`.
- `lib/fx` — Exchange rate provider interface, Frankfurter adapter and rate lookup.
- `lib/notifications` — Alert creation and delivery.
- `prisma/` — Prisma schema and migrations, including hand-written RLS SQL. `prisma.config.ts`
  at the project root sets the schema path, migrations path and the CLI's connection.
- `tests/unit` — Vitest unit tests. No database and no secrets.
- `tests/db` — Vitest database tests. They run only on CI, against a throwaway Postgres 17 that the
  workflow builds from every migration and then discards, never against either Supabase project.
- `tests/e2e` — Playwright tests, run against a production build in Chromium at desktop and phone width.
- `.github/workflows/` — GitHub Actions CI: lint, type check, unit tests and build; migrations and
  database tests; Playwright. It uses no secrets, and the repository is public, so its logs are public.

## Storage Model

- **Database (PostgreSQL)**: `profiles` (exists since unit 1.5), `transactions` (since unit 2.2),
  `categories`, `tags`,
  `transaction_tags`, `attachments` (metadata only), `recurring_rules`,
  `fx_rates`, `budgets`, `goals`, `goal_milestones`, `notifications`,
  `categorization_rules`, `investments`, `investment_transactions`, `debts`,
  `debt_payments`.
- **File storage (private Supabase bucket)**: Receipt and invoice files, as images
  or PDFs of up to 5 MB each, under a path that begins with the owner's user ID.
- **Supabase `auth` schema**: Users, identities and 2FA factors. Supabase manages
  it and Prisma must not. `profiles.id` holds the auth user's ID without a database
  foreign key, and account deletion removes app data in application code.
- **`profiles` (unit 1.5):** one row per user, keyed by the auth user's ID, so `id` is its owner column
  (every other user-owned table has a separate `user_id`). Columns: `display_name` (`varchar(50)`, null
  for no name, never blank), `preferred_currency` (`char(3)`, upper case), `created_at`, `updated_at`.
  The row is created on the first save (an `upsert`); reading a user with no row returns the defaults
  (no name, USD) and writes nothing. So every way an account comes to exist (email, Google, the Supabase
  dashboard) works with no trigger on `auth.users`. Which currency codes are allowed is the app's list,
  not the database's; the table only checks the format. The account menu reads the name on every app
  page; if that read fails it falls back to the email, so the shell never errors because of it.
- **`transactions` (unit 2.2):** one income or expense per row, owned by `user_id` (no foreign key to
  `auth.users`), with `type` (the Postgres enum `transaction_type`: `income`, `expense`), `amount`
  (`numeric(19, 4)`, above 0 and below 10^12), `currency` (`char(3)`), `occurred_on` (a calendar `date`),
  `description` (`varchar(100)`, never blank), `created_at` and `updated_at`. Checks:
  `transactions_amount_range`, `transactions_currency_format`, `transactions_description_not_blank`;
  index on (`user_id`, `occurred_on` desc, `created_at` desc). Decimal places per currency are the app's
  rule. A date is written as that day's UTC midnight and read back as the UTC date, so it never shifts.
  Single-row reads and writes filter on `id` and `user_id` together, so another user's row looks missing.
  Delete is permanent. Categories, tags, notes and receipts arrive in units 2.3 and 2.5.
- **Exchange rates**: `fx_rates` is shared reference data keyed by date and currency
  pair. It has no owner, and only the daily job writes to it.

### Environments

- **Development:** a free Supabase project for `migrate dev` and test data, configured in
  `.env.local`.
- **Production:** a separate free Supabase project holding real data, configured in Vercel. It
  receives schema changes only through `migrate deploy`.

Both projects are in `ap-southeast-2` (Sydney), confirmed in unit 0.3. Vercel's functions run in
`syd1`, the same region (unit 0.6).

### Connection Strings

Each project has two connection strings, both for the dedicated `prisma` role
(`prisma.<project-ref>`):

| Variable       | Supabase pooler            | Used by                                          |
| -------------- | -------------------------- | ------------------------------------------------ |
| `DATABASE_URL` | Transaction, port 6543, with `?pgbouncer=true` | The app at runtime, through `lib/db/client.ts` |
| `DIRECT_URL`   | Session, port 5432         | The Prisma CLI and migrations, through `prisma.config.ts` |

- The direct connection is IPv6-only on the free plan, so migrations use the session pooler.
- `.env.local` holds the development strings only. `.env.example` documents the shape.
- Production strings live only in Vercel and the owner's password manager, never in a file in
  the project folder. A production CLI command gets `DIRECT_URL` from the shell for that one
  command; `prisma.config.ts` loads env files with `@next/env`, which never overrides a variable
  already set in the shell. The CLI output shows only the shared regional pooler host, so check
  that the pasted string's user is `prisma.<prod-ref>` before running it.

### Production Migrations

The owner applies migrations to production from their own terminal, in the project folder. Only
`migrate status` and `migrate deploy` ever run against production; never `migrate dev`, `migrate reset`
or `db push`.

0. Take a backup first, with the routine and checks in Backups below. Don't continue unless both "ok"
   lines appear and the checks pass.
1. Check that the production session string's user is `prisma.<prod-ref>`. Backups (step 0) use the
   `postgres.<prod-ref>` string, but migrations must not. Running `migrate deploy` as `postgres` makes
   `postgres` own the new tables; that happened to `_prisma_migrations` in unit 0.4. Keep the two strings
   clearly named in the password manager.
2. Set `DIRECT_URL` for one command at a time, using the syntax of the shell in use. In Git Bash (the
   owner's usual terminal), read the string at a hidden prompt so it never enters shell history:

   ```bash
   read -rsp 'Production DIRECT_URL: ' PROD_URL; echo
   DIRECT_URL="$PROD_URL" npx prisma migrate status
   DIRECT_URL="$PROD_URL" npx prisma migrate deploy
   unset PROD_URL
   ```

   In PowerShell, `$env:DIRECT_URL = "<string>"; npx prisma migrate status; Remove-Item Env:DIRECT_URL`
   works, but the string is saved to PowerShell's history file (`ConsoleHost_history.txt`), so remove
   that line afterwards. PowerShell syntax fails in Git Bash: the assignment errors out, `DIRECT_URL` is
   never set, and the command silently runs against development from `.env.local`.
3. Run `migrate deploy` only if `migrate status` lists exactly the expected unapplied migrations. If
   `status` reports "up to date" when a new migration exists, the command reached development: stop.

### Backups

Supabase Free has no automatic backups (Supabase docs, checked 2026-11-16, and the production dashboard:
"Free Plan does not include project backups"). The owner runs this routine by hand, from Git Bash
(unit 0.7). It needs no Docker: `pg_dump`, `pg_restore` and `psql` 17.6 are in `C:\Users\ramos\pgsql\bin`,
and `gpg` ships with Git Bash. Both projects run Postgres 17.11; the client's major version must not be
older than the server's.

**When:**

- on the 1st of every month;
- just before every production `migrate deploy` (step 0 above).

**Retention:** keep the last 12 monthly backups. Delete a pre-migration backup once the next monthly one has
passed its checks.

**Where:** `C:\Users\ramos\Documents\FinTrack-backups`, outside the project folder. There's no second
copy yet (owner's decision); revisit in Phase 2, when real data starts. `.gitignore` ignores
`fintrack-backup-*` as a second guard.

**What each backup holds** (two files, made with the `postgres` role over the session pooler, user
`postgres.<prod-ref>`):

| File | Contents |
| --- | --- |
| `fintrack-backup-prod-<YYYY-MM-DD-HHMM>-public.dump.gpg` | The `public` schema, structure and data, in custom format: every app table, `_prisma_migrations` and RLS settings. No owners or grants (`--no-owner --no-privileges`), so a restore is owned by whoever runs it, the `prisma` role. |
| `fintrack-backup-prod-<YYYY-MM-DD-HHMM>-auth.sql.gpg` | `auth` rows only: users, identities and 2FA factors. Supabase owns the tables, so only rows are kept. Without this file, restored data would belong to user IDs that no longer exist. |

Database dumps never include Storage files, so receipts need their own routine in Phase 2.

**The routine:**

```bash
set -o pipefail
read -rsp 'Production postgres session string: ' PROD_URL; echo
export PGSSLMODE=require
DIR="$HOME/Documents/FinTrack-backups"; mkdir -p "$DIR"
STAMP=$(date +%Y-%m-%d-%H%M)
PUB="$DIR/fintrack-backup-prod-$STAMP-public.dump.gpg"
AUTH="$DIR/fintrack-backup-prod-$STAMP-auth.sql.gpg"

pg_dump "$PROD_URL" --format=custom --schema=public --no-owner --no-privileges \
  | gpg --symmetric --cipher-algo AES256 --output "$PUB" \
  && echo "public: ok" || { rm -f "$PUB"; echo "public: FAILED"; }

pg_dump "$PROD_URL" --format=plain --data-only --schema=auth \
  | gpg --symmetric --cipher-algo AES256 --output "$AUTH" \
  && echo "auth: ok" || { rm -f "$AUTH"; echo "auth: FAILED"; }

unset PROD_URL PGSSLMODE; set +o pipefail
```

- Check the pasted string's user is `postgres.<prod-ref>` before pressing Enter.
- `gpg` asks for the backup passphrase, which is in the password manager. `gpg-agent` remembers it for the
  second file. If no prompt appears, add `--pinentry-mode loopback` after `gpg` so it asks in the terminal.
- `pipefail` makes a failed `pg_dump` count as a failure. The failed file is deleted, because `gpg` still
  writes a small, useless one. That was seen in the rehearsal.
- If the `auth` dump reports "permission denied" on a table, record the table and leave it out with
  `--exclude-table=auth.<table>`. Revisit in Phase 1, and don't change grants.

**Checks after every backup** (in the same shell, so `$PUB`, `$AUTH` and `$DIR` are still set):

```bash
ls -l "$DIR"/fintrack-backup-prod-$STAMP-*
gpg --decrypt "$PUB" | pg_restore --list | grep -E "TABLE|ROW SECURITY"
gpg --decrypt "$PUB" | pg_restore --data-only --table=_prisma_migrations --file=- | grep -c "^[0-9a-f]\{8\}-"
gpg --decrypt "$AUTH" | head -n 5
```

Expected results:

1. Both files exist; the public file is at least about 1 KB.
2. The list shows `_prisma_migrations` with its `TABLE`, `TABLE DATA` and `ROW SECURITY` entries, and
   later every application table.
3. The count equals the number of applied migrations in production's `migrate status`.
4. The auth file starts with a `-- PostgreSQL database dump` header.

**Rules:**

- Never write an unencrypted backup to disk.
- Never put a backup in the project folder, GitHub, chat or an issue.
- Never restore into production with this routine.
- The agent never runs it against production.

**Not covered yet:**

- A full restore drill, planned for Phase 2. Until then, the checks above prove each backup is complete
  and readable, not that it restores. Supabase's restore guide sets `session_replication_role = replica`
  before loading data.
- Storage files (Phase 2).
- An off-machine copy.

### Free-Tier Constraints

- The free plan allows two active projects, and both were active at the same time (confirmed in
  unit 0.3). The development project has no daily job, so it may pause when unused and need
  restoring.
- Supabase Free has limited storage, so receipts have a size limit.
- Free projects pause when they don't get "sufficient user database activity over the past week".
  Supabase says "a few user requests to the database each day" is typically enough, but doesn't say
  whether a scheduled `SELECT 1` counts. Production's daily `heartbeat` started on 2026-11-16; on
  2026-11-23, after 8 daily runs, the owner confirmed production was still active, not paused. A paused project can be restored
  for up to 1 year (Supabase docs, checked 2026-11-16).
- Supabase Free has no automatic backups (confirmed in unit 0.7), so the owner runs the manual routine in
  Backups.
- Vercel Schedules (checked 2026-11-15) are in public beta, and Vercel calls Cron Jobs legacy. On
  Hobby: up to 100 static schedules per deployment and 5,000 runs per billing period (manual runs
  count), at most every 15 minutes, starting within a 15-minute jitter window, in a named time zone.
  Path targets aren't retried, and a run can be skipped or delivered twice, so scheduled work must be
  idempotent and catch up on the next run. Alerts fire when a transaction is saved, not from a schedule.
- Frankfurter publishes 30 currencies (checked 2026-11-25; BGN was dropped after Bulgaria joined the
  euro). FinTrack offers exactly those, so every code can be converted in Phase 3.
- Supabase's built-in auth email reaches only the Supabase team, at about 2 per
  hour. That suits a single owner; other email sign-ups would need custom SMTP.

## Deployment

- **Vercel Hobby**, linked to the GitHub repository. `main` deploys to production at the project's
  `*.vercel.app` address; there is no custom domain. Preview deployments of `development` are off
  (`git.deploymentEnabled` in `vercel.json`) until Phase 1 revisits them.
- Functions run in `syd1` and on Node 24 (`engines.node` in `package.json`, since Vercel's default is
  newer). Both are set in the repository, not only in the dashboard.
- Production's `DATABASE_URL` (transaction pooler) and `CRON_SECRET` are set in Vercel for Production
  only, as the **Secret** type (write-only after saving; Vercel's newer name for Sensitive). `DIRECT_URL` is never set in Vercel: the build doesn't run migrations, and
  production schema changes follow Production Migrations above.
- Production's `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are also set in
  Vercel for Production only (Config type is fine; they are public). `NEXT_PUBLIC_` values are inlined at
  build time, so a change needs a redeploy.
- CI's `checks` and `e2e` builds set a placeholder `DATABASE_URL`, because `lib/db/client.ts` needs it
  when the build loads a route that imports the data layer. Nothing connects to it. They also set
  placeholder Supabase values (`http://127.0.0.1:54321`, `sb_publishable_placeholder`) that nothing
  listens on, so CI never reaches a real Supabase project.
- Schedules: `heartbeat` calls `POST /api/cron/heartbeat` at 03:00 `Asia/Singapore` and runs a
  read-only `SELECT 1`. Later jobs add their own schedule and route.
- A deployment keeps the `CRON_SECRET` it was built with. To rotate it, change it in Vercel, redeploy,
  and check the next run.

## Auth and Access Model

- Every user signs in through Supabase Auth with email and password, or Google (unit 1.3). Facebook was
  removed on 2026-11-18 (owner's decision).
- Sessions live in cookies set by `@supabase/ssr`. `proxy.ts` refreshes the session (unit 1.1a) and
  applies the route rules (unit 1.2a), but it is not the authorization boundary.
- **Session cookie flags:** `SameSite=Lax`, a 400-day `maxAge` (`@supabase/ssr`'s defaults), and
  `Secure` when the request came over HTTPS (`lib/auth/cookie-options.ts`, passed by both clients as
  `cookieOptions`; from `x-forwarded-proto`, or the URL's protocol in the proxy). `@supabase/ssr`'s
  defaults have no `secure`; this was found by unit 1.1a's production check 8 and fixed on 2026-11-19
  without a separate spec (owner's decision). Not `HttpOnly`, by `@supabase/ssr`'s design.
- **Route rules (unit 1.2a, `lib/auth/routes.ts`):** pages are protected by default. The public pages
  are listed in `lib/auth/paths.ts`: guest pages (`/sign-in`, `/sign-up`, `/forgot-password`; signed-in
  users go to the dashboard), open pages (`/reset-password`, `/check-email`, `/auth-error`; both states,
  and `/reset-password` must stay open because a reset link signs the browser in), and the
  passed-through `/auth/*` and `/api/*`. `/` goes to `/sign-in` signed out and `/dashboard` signed in.
  A signed-out visit elsewhere goes to `/sign-in?next=<path and query>`, and `signIn` returns there
  through `safeReturnPath` (same-origin app pages only). Only `GET` and `HEAD` are redirected; Server
  Actions are `POST`s and authorize themselves. Redirects are `307` and carry any refreshed session
  cookies. If the session can't be verified, the browser counts as signed out.
- Pages and Server Components get the user through `requireUser()`, which redirects to `/sign-in`
  without a session and to `/two-factor` while the 2FA code is owed (a second line behind the proxy).
  Server Actions that touch user data use `getSignedInUser()` and return an error result; only auth code
  (the 2FA step, the reset flow) reads `getCurrentClaims()` directly.
- Server code identifies the user with `supabase.auth.getClaims()` (through `getCurrentClaims()`), never
  `getSession()`. Both projects use ECC (asymmetric) JWT signing keys, so claims are verified locally
  without a call to Supabase Auth.
- **Email and password (unit 1.1a):** every step (sign up, sign in, sign out, request reset, set a new
  password) is a Server Action; there is no browser Supabase client. Email confirmation is on.
- **Email links (unit 1.1a, amended):** the templates stay at Supabase's defaults, because the free plan
  locks them while its built-in email is used. `signUp` and `requestPasswordReset` pass
  `<origin>/auth/confirm?next=<path>` as the redirect, built from the Server Action's `Origin` header
  (`emailRedirectUrl` in `lib/auth/redirect.ts`). The link opens Supabase's verify endpoint, which
  returns there with a PKCE `code`; `/auth/confirm` exchanges it with `exchangeCodeForSession`. This only
  works in the browser that asked for the email, which holds the code verifier cookie. A sign-up opened
  elsewhere is still confirmed (the user then signs in); a reset must be requested again in the right
  browser. `/auth/confirm` also handles token-hash links (`verifyOtp`), so adding custom SMTP and the
  token-hash templates later lifts the limit with no code change. `next` is checked against an allowlist
  (`/dashboard`, `/reset-password`).
- **Google sign-in (unit 1.3):** the "Continue with Google" form on `/sign-in` and `/sign-up` posts to
  the `signInWithGoogle` Server Action (React's form-action shape, so it works without JavaScript). It
  builds `<origin>/auth/callback?next=<safe path>` with `oauthRedirectUrl` (`lib/auth/redirect.ts`) from
  the request's `Origin` header, and calls `signInWithOAuth`, which makes no network call: it returns
  Supabase's authorize URL and stores the PKCE code verifier in a cookie. The browser goes to Supabase,
  Google, Supabase's own callback, then `/auth/callback`, which exchanges the `code` (same browser only)
  and checks `next` again with `safeReturnPath`. Failures (a cancel, a refusal, no or bad code, a failed
  exchange) go to `/sign-in?error=google`, where the form shows one message and removes the parameter.
  Only a safe `error` code is logged, never `error_description`. Supabase links a Google identity to an
  existing user with the same verified email; there is no linking UI. Facebook was removed on
  2026-11-18 (owner's decision).
  - **Setup:** one Google OAuth client (Web application) in the owner's Google Cloud project, shared by
    both Supabase projects, with both projects' Supabase callback URLs as redirect URIs. Its secret lives
    only in each Supabase project's Google provider settings, never in the app, Vercel or GitHub.
  - **Audience:** Google's app stays in **Testing**, but that doesn't limit who can sign in: Google admits
    any account when an app asks only for `openid`, `email` and `profile`. Owner-only is enforced by
    Supabase's **"Allow new users to sign up"**, turned off in both projects (2026-11-18). No new account
    can be created by Google or email; the owner's existing account signs in either way. A blocked Google
    sign-up comes back to `/auth/callback` with an OAuth `error`; a blocked email sign-up gets the generic
    message. Opening sign-up is a Phase 12 open question.
  - The existing Redirect URLs (`<origin>/**`) already cover `/auth/callback`.
- **Reset link re-click (unit 1.1b):** Supabase uses up an email link on its first click. Requesting a
  reset sets a `fintrack-reset-pending` cookie (`lib/auth/reset-pending.ts`; value `1`, HttpOnly,
  SameSite=Lax, `Path=/`, 1 hour to match Supabase's Email OTP Expiration). It is set on every path to
  the check-email page, so it reveals nothing about the account. When a reset link no longer works,
  `/auth/confirm` sends the browser to `/reset-password` instead of `/auth-error` only if `next` is
  `/reset-password`, the cookie is present and the browser is signed in. `updatePassword` (on success)
  and `signOut` delete it. The cookie is a hint, never a permission: the session is what allows the
  password change, and other browsers still get the error page.
- **Supabase URL Configuration:** each project's **Site URL** is its own app (development
  `http://localhost:3000`, production `https://fintrack-kappa-blush.vercel.app`), and its **Redirect
  URLs** list only that origin (`http://localhost:3000/**`, `https://fintrack-kappa-blush.vercel.app/**`).
  A redirect outside the list falls back to the Site URL's home page, so email links only work from that
  origin (the dev server must run on port 3000).
- **Passwords:** at least 8 characters, with a lowercase letter, an uppercase letter and a digit; at most
  72. Both projects enforce it ("Lowercase, uppercase letters and digits"), and the Zod schema mirrors
  it, so a caller bypassing the app can't set a weaker one. Leaked-password checks need a paid plan.
- **No account enumeration:** sign-up and password reset always end on the same check-email page, and
  sign-in has one message for a wrong email or password.
- **Public Supabase variables:** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  per project (development in `.env.local`, production in Vercel, Production only). Both are public by
  design. The secret key (`sb_secret_…`) and the `service_role` key are not used.
- **Two-factor authentication (unit 1.4):** optional, authenticator apps (TOTP) only, turned on and off
  in Settings → Security. Supabase Auth's MFA, free on every plan, through the server client (no browser
  Supabase client).
  - **Session states** (`lib/auth/assurance.ts`): `signed-out` (no verified token, or Supabase no longer
    accepts the session); `needs-2fa` (token at `aal1` and the user has a **verified** TOTP factor);
    `signed-in` (`aal2`, or `aal1` with no verified factor). An `aal2` token needs no network call. An
    `aal1` token asks Supabase (`getUser()`) for the factors, because they aren't in the token and the
    session cookie's copy of the user can be edited by the browser. If Supabase can't answer, the session
    is `needs-2fa` (fail closed). React's `cache()` shares the answer within a render.
  - **Route rules for `needs-2fa`:** `/`, guest pages and protected pages go to
    `/two-factor?next=<page>`; `/reset-password` goes to `/two-factor?next=/reset-password`, so a reset
    link can't skip the code; `/check-email`, `/auth-error`, `/auth/*` and `/api/*` are unchanged.
    `/two-factor` itself sends signed-out browsers to `/sign-in` and signed-in ones on to
    `safeTwoFactorNext(next)` (a safe app page, or `/reset-password`).
  - **Sign-in paths:** `signIn` and `/auth/callback` read the user from Supabase's own response and go to
    `/two-factor?next=…` when it has a verified TOTP factor. `verifyTwoFactor` checks the code with
    `mfa.challengeAndVerify`, which raises the session to `aal2`. `updatePassword` refuses `needs-2fa`.
  - **Setup and removal:** `startTwoFactorSetup` removes any abandoned (unverified) factor, then enrolls
    one (`friendlyName` "Authenticator app", `issuer` "FinTrack") and returns the QR code and setup key to
    the browser only (never in a server render). Verifying the first code signs out the user's other
    sessions (Supabase's behaviour). Turning it off needs a current code, then `unenroll` and a session
    refresh. One TOTP factor per user.
  - **Lost authenticator app:** no in-app recovery. The owner keeps the setup key in the password manager
    (it can set up any authenticator app again); the last resort is the Supabase dashboard
    (Authentication → Users → the user → remove the MFA factor). The owner's Supabase account has its own
    2FA, since the dashboard is that last resort. Supabase's MFA recovery codes are experimental in
    auth-js 2.119.0 and not used.
  - Codes, setup keys, QR codes, `otpauth://` URIs and factor IDs are never logged.
- Every user-owned row has one owner, its `user_id`. There is no sharing and there
  are no admin roles, so only the owner can read or change a row.
- Server Actions and Route Handlers get the user ID from the verified session, never
  from client input.
- Prisma connects as the dedicated `prisma` role, created with `BYPASSRLS` as in Supabase's
  Prisma guide (unit 0.3). Unit 0.4 confirmed it in practice on development: with RLS forced on and
  no policies, `prisma` could still insert and read rows. RLS therefore doesn't limit Prisma
  queries; the data layer's `user_id` filters enforce per-user access.
- Tables the `prisma` role creates give `anon` and `authenticated` no `select`, `insert`, `update`
  or `delete` privileges. This was checked on development in unit 0.4, including `_prisma_migrations`.
- Tables created by `postgres` still received full grants for `anon`, `authenticated` and
  `service_role` in production, despite Supabase's 2026-10-30 change. Production's `_prisma_migrations`,
  created when unit 0.4's `migrate deploy` ran as `postgres`, had them. On 2026-11-16 the owner moved it
  to `prisma` and revoked those grants (see Production Migrations, step 1). Migrations must run as
  `prisma`.
- The Supabase Data API is turned off in both projects (owner's decision, unit 0.4, 2026-11-13), so
  its REST and GraphQL endpoints answer for no table. Supabase Auth and Storage are separate
  services and aren't documented as needing it; unit 1.1a's hand checks confirmed sign-up, sign-in and password
  reset work with it off (2026-11-16).
- Browser access to data is therefore blocked three ways: no Data API, no grants for `anon` and
  `authenticated`, and RLS with no public policies. Security Advisor's Info item "RLS enabled, but
  no policies exist" is expected on every table and is not a problem.
- Receipts are served only through short-lived signed URLs, created after an
  ownership check.
- Scheduled routes require the `CRON_SECRET` bearer token, compared in constant time, and refuse
  every request when it isn't set.

## Invariants

1. Money is never a JavaScript float: `numeric` in Postgres, Prisma `Decimal` on the
   server, and decimal strings across to the client. Outside the database an amount is one canonical
   string (unit 2.1): ASCII digits, no grouping or sign, no leading zeros, exactly the currency's decimal
   places (`"1234.50"`, `"1500"` for JPY). Amounts are always above 0, up to 999,999,999,999; a
   transaction's direction is its own field.
2. Every transaction keeps its original amount and currency. Converted values come
   from the dated `fx_rates` table, so changing the preferred currency never rewrites
   history.
3. Every user-owned row has a `user_id`, and all queries go through the server-only
   data layer, which requires it. Prisma Client is never imported outside `lib/db`.
4. RLS is on for every table, with no public policies, so the browser cannot query
   data directly.
5. Mutations verify auth and ownership on the server and validate input with Zod
   before any logic runs.
6. If a user has 2FA enrolled, every sign-in method must complete it before data
   access (unit 1.4: `requireUser()` for pages, `getSignedInUser()` for data actions).
7. Receipts stay in a private bucket, and the database holds only their metadata.
8. Scheduled jobs are idempotent: a unique key on rule and date means a retry cannot
   double-post.
9. Per-user data is not cached by default. If cached later, the user ID is an explicit
   argument, and `cookies()` is read outside the cached scope.
10. External providers sit behind interfaces, and any provider tokens are encrypted at
    the app level.
11. Data is encrypted in transit with TLS and at rest by the database and storage
    platform.
