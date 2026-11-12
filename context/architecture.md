# Architecture Context

## Stack

| Layer              | Technology                                 | Role                                                   |
| ------------------ | ------------------------------------------ | ------------------------------------------------------ |
| Framework          | Next.js 16 + React 19 + TypeScript         | Frontend, routing and server rendering                 |
| Backend            | Server Actions and Route Handlers          | Mutations, cron endpoints and file exports             |
| UI                 | Tailwind v4 + shadcn/ui + Lucide           | Styling, accessible components and icons               |
| Database           | PostgreSQL on Supabase (Free)              | All relational application data                        |
| ORM                | Prisma + Prisma Migrate                    | Schema, typed queries and migrations                   |
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
- `lib/db` — Prisma Client and all database access. Server-only.
- `lib/auth` — Session, ownership and 2FA checks. Server-only.
- `lib/money` — All decimal arithmetic, conversion and money formatting.
- `lib/fx` — Exchange rate provider interface, Frankfurter adapter and rate lookup.
- `lib/notifications` — Alert creation and delivery.
- `prisma/` — Prisma schema and migrations, including hand-written RLS SQL.
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

### Free-Tier Constraints

- Confirm in Phase 0 that the free plan allows both projects to stay active. The development
  project has no daily job, so it may pause when unused and need restoring.
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
- Prisma connects with a privileged server role that is expected to bypass RLS
  (confirm in Phase 0). RLS therefore blocks browser access through Supabase's public
  API, while the data layer enforces per-user access for Prisma queries.
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
