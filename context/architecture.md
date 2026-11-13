# Architecture Context

## Stack

| Layer              | Technology                                 | Role                                                   |
| ------------------ | ------------------------------------------ | ------------------------------------------------------ |
| Framework          | Next.js 16 + React 19 + TypeScript         | Frontend, routing and server rendering                 |
| Backend            | Server Actions and Route Handlers          | Mutations, cron endpoints and file exports             |
| UI                 | Tailwind v4 + shadcn/ui + Lucide           | Styling, accessible components and icons               |
| Database           | PostgreSQL on Supabase (Free)              | All relational application data                        |
| ORM                | Prisma 7 + Prisma Migrate, `pg` adapter    | Schema, typed queries and migrations                   |
| Auth               | Supabase Auth                              | Email, Google and Facebook sign-in; authenticator 2FA  |
| File storage       | Supabase Storage (private bucket)          | Receipts and invoices                                  |
| Validation, forms  | Zod + React Hook Form                      | Shared validation schemas and form state               |
| Charts             | Recharts (through shadcn charts)           | Dashboard and report charts                            |
| Tables             | TanStack Table                             | Transaction history sorting and filtering              |
| Exchange rates     | Frankfurter (behind a provider interface)  | Current and historical daily rates; no API key         |
| Scheduled jobs     | Vercel Cron                                | Daily rate sync and recurring transaction posting      |
| Notifications      | In-app; Web Push in Release 2              | Budget and significant-transaction alerts              |
| Exports            | Papa Parse, ExcelJS, react-pdf             | CSV, Excel and PDF generation                          |
| Formatting         | Native `Intl`                              | Regional date, number and currency display             |
| Testing            | Vitest + Playwright                        | Unit, end-to-end and cross-user access tests           |
| Hosting            | Vercel Hobby                               | Deployment for a personal, non-commercial project      |

Bank linking has no selected provider until a country is chosen. Email alerts are
optional and need a verified domain, which also means a sending service such as
Resend.

## System Boundaries

- `app/(auth)` — Sign-in, sign-up and 2FA screens.
- `app/(app)/<feature>` — Authenticated pages, plus each feature's Server Actions.
- `app/api/cron` — Secret-protected scheduled job endpoints.
- `components/ui` — Generated shadcn/ui components.
- `components/<feature>` — Feature-specific components.
- `lib/db` — Prisma Client and all database access. Server-only. The shared client is
  `lib/db/client.ts`, and the generated client is in `lib/db/generated/` (git-ignored).
- `lib/auth` — Session, ownership and 2FA checks. Server-only.
- `lib/money` — All decimal arithmetic, conversion and money formatting.
- `lib/fx` — Exchange rate provider interface, Frankfurter adapter and rate lookup.
- `lib/notifications` — Alert creation and delivery.
- `prisma/` — Prisma schema and migrations, including hand-written RLS SQL. `prisma.config.ts`
  at the project root sets the schema path, migrations path and the CLI's connection.
- `tests/` — Vitest and Playwright tests.

## Storage Model

- **Database (PostgreSQL)**: `profiles`, `categories`, `tags`, `transactions`,
  `transaction_tags`, `attachments` (metadata only), `recurring_rules`,
  `fx_rates`, `budgets`, `goals`, `goal_milestones`, `notifications`,
  `categorization_rules`, `investments`, `investment_transactions`, `debts`,
  `debt_payments`.
- **File storage (private Supabase bucket)**: Receipt and invoice files, as images
  or PDFs of up to 5 MB each, under a path that begins with the owner's user ID.
- **Supabase `auth` schema**: Users, identities and 2FA factors. Supabase manages
  it and Prisma must not. `profiles.id` holds the auth user's ID without a database
  foreign key, and account deletion removes app data in application code.
- **Exchange rates**: `fx_rates` is shared reference data keyed by date and currency
  pair. It has no owner, and only the daily job writes to it.

### Environments

- **Development:** a free Supabase project for `migrate dev` and test data, configured in
  `.env.local`.
- **Production:** a separate free Supabase project holding real data, configured in Vercel. It
  receives schema changes only through `migrate deploy`.

Both projects are in `ap-southeast-2` (Sydney), confirmed in unit 0.3. Vercel's function region
should match (unit 0.6).

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

1. Check that the production session string's user is `prisma.<prod-ref>`.
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

### Free-Tier Constraints

- The free plan allows two active projects, and both were active at the same time (confirmed in
  unit 0.3). The development project has no daily job, so it may pause when unused and need
  restoring.
- Supabase Free has limited storage, so receipts have a size limit.
- Free projects pause after 7 days of inactivity. The daily job should count as
  activity (confirm in Phase 0).
- Supabase Free is expected to have no automatic backups (confirm in Phase 0), so
  the project needs a documented manual `pg_dump` routine.
- Vercel Hobby cron runs once a day and at an imprecise time, so scheduled work must
  tolerate both. Alerts fire when a transaction is saved, not from cron.
- Supabase's built-in auth email reaches only the Supabase team, at about 2 per
  hour. That suits a single owner; other email sign-ups would need custom SMTP.

## Auth and Access Model

- Every user signs in through Supabase Auth with email and password, Google or
  Facebook.
- Sessions live in cookies. `proxy.ts` refreshes the session and redirects signed-out
  users, but it is not the authorization boundary.
- If a user has 2FA enrolled, the session must reach assurance level `aal2` before
  any financial data is available, whichever sign-in method was used.
- Every user-owned row has one owner, its `user_id`. There is no sharing and there
  are no admin roles, so only the owner can read or change a row.
- Server Actions and Route Handlers get the user ID from the verified session, never
  from client input.
- Prisma connects as the dedicated `prisma` role, created with `BYPASSRLS` as in Supabase's
  Prisma guide (unit 0.3). Unit 0.4 confirmed it in practice on development: with RLS forced on and
  no policies, `prisma` could still insert and read rows. RLS therefore doesn't limit Prisma
  queries; the data layer's `user_id` filters enforce per-user access.
- Tables the `prisma` role creates give `anon` and `authenticated` no `select`, `insert`, `update`
  or `delete` privileges (checked in unit 0.4, including `_prisma_migrations`). Supabase stopped
  granting them automatically on new `public` tables on 2026-10-30.
- The Supabase Data API is turned off in both projects (owner's decision, unit 0.4, 2026-11-13), so
  its REST and GraphQL endpoints answer for no table. Supabase Auth and Storage are separate
  services and aren't documented as needing it; Phase 1 confirms sign-in works with it off.
- Browser access to data is therefore blocked three ways: no Data API, no grants for `anon` and
  `authenticated`, and RLS with no public policies. Security Advisor's Info item "RLS enabled, but
  no policies exist" is expected on every table and is not a problem.
- Receipts are served only through short-lived signed URLs, created after an
  ownership check.
- Cron routes require the `CRON_SECRET` bearer token.

## Invariants

1. Money is never a JavaScript float: `numeric` in Postgres, Prisma `Decimal` on the
   server, and decimal strings across to the client.
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
   access.
7. Receipts stay in a private bucket, and the database holds only their metadata.
8. Scheduled jobs are idempotent: a unique key on rule and date means a retry cannot
   double-post.
9. Per-user data is not cached by default. If cached later, the user ID is an explicit
   argument, and `cookies()` is read outside the cached scope.
10. External providers sit behind interfaces, and any provider tokens are encrypted at
    the app level.
11. Data is encrypted in transit with TLS and at rest by the database and storage
    platform.
