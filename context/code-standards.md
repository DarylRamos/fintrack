# Code Standards

## General

- Keep modules small and single-purpose.
- Fix root causes; do not layer workarounds.
- Do not mix unrelated concerns in one component or route.
- Do not add abstractions until a second real use needs them. External providers are the
  exception, per `architecture.md`.
- All user-facing text is English. Do not add a translation layer.

## TypeScript

- Strict mode is required throughout the project.
- Avoid `any`. Use explicit interfaces or narrowly scoped types.
- Validate unknown external input with Zod at system boundaries before trusting it. This
  includes form data, provider responses, CSV imports and `$queryRaw` results.
- Represent money crossing to the client as decimal strings, and never use `number` for
  it. Calculations go through `lib/money`.
- Use calendar `date` values for a transaction's date, not timestamps, so totals don't
  shift across time zones.

## Next.js

- This version differs from older conventions, for example using `proxy.ts` rather than
  middleware. Check the relevant guide in `node_modules/next/dist/docs/` before using a
  Next.js API, and heed deprecation notices.
- Default to Server Components. Add `use client` only when browser interactivity requires
  it.
- `cacheComponents` is on. Follow the bundled docs for wrapping dynamic content in
  `Suspense`.
- Do not use `use cache` for per-user data by default (invariant 9). Shared reference data
  such as exchange rates may be cached.
- Use Server Actions for app mutations. Treat each as a public endpoint, checking auth,
  ownership and input every time.
- Keep Route Handlers focused on a single responsibility: cron jobs and file exports.
- Protect pages through `proxy.ts` for redirects, but authorize in the server code that
  reads or changes data.

## Prisma

- Check the docs for the installed Prisma version, as examples online may target an older
  one.
- Use one shared Prisma Client in `lib/db`, marked `server-only`. Do not import it anywhere
  else.
- The app connects through the pooled URL. Migrations use the direct or session URL.
- Data-layer functions take `userId` as a required argument and filter by it on every read
  and write to user-owned tables.
- Use `Decimal` columns: `@db.Decimal(19, 4)` for money and `@db.Decimal(28, 10)` for
  investment quantities and exchange rates.
- Convert `Decimal` values to strings before they leave the data layer.
- Change the schema only through Prisma Migrate. Run `migrate dev` only against the
  development Supabase project, and apply changes to production with `migrate deploy`.
- Do not use `db push` on a database with real data, and do not edit a migration that has
  already been applied.
- Every new table's migration enables RLS through hand-added SQL
  (`migrate dev --create-only`), with no public policies.
- Do not model or migrate the Supabase `auth` schema.
- Use `$queryRaw` tagged templates for complex report queries. Never use
  `$queryRawUnsafe` or build SQL from strings.

## Styling

- Use the CSS custom property tokens in `ui-context.md`, with no hardcoded hex values.
- Follow the border radius scale in `ui-context.md`.
- Use Tailwind utilities. Add custom CSS only for token definitions or what utilities can't
  express.
- Build mobile-first, with no horizontal page scroll at phone width.
- Keep interfaces keyboard-accessible, with visible focus states and labeled controls.

## API Routes

- Validate and parse request input before any logic runs.
- Enforce auth and ownership before any mutation.
- Return consistent shapes: `{ data }` on success and `{ error: { code, message } }` on
  failure, with accurate HTTP status codes. Server Actions return the same shape.
- Never expose stack traces, SQL or provider errors to the client.
- Cron routes verify `CRON_SECRET` and are safe to run repeatedly.

## Data and Storage

- Relational data and file metadata belong in the database.
- Receipt files belong in the private storage bucket, never in the database.
- Check file type and size on the server: images or PDFs, up to 5 MB.
- Store a transaction's original amount and currency. Do not store converted totals.
- Secrets stay in server-only environment variables, are never committed, and never use the
  `NEXT_PUBLIC_` prefix.
- Do not log financial data, tokens or personal details.

## Testing

- Unit test all logic in `lib/money` and `lib/fx`, recurring schedules, and investment and
  debt calculations.
- Each feature that stores user data has a test proving one user can't read or change another
  user's data.
- Each feature's main flow has a Playwright test.

## File Organization

- `app/` — Routes, layouts and feature Server Actions.
- `components/ui/` — Generated shadcn/ui components.
- `components/app-shell/` — The sidebar, phone top bar and page header shared by signed-in pages.
- `components/<feature>/` — Feature-specific components.
- `hooks/` — Generated shadcn/ui hooks, such as `use-mobile.ts`. Not hand-edited.
- `lib/utils.ts` — Generated `cn()` helper. Not hand-edited.
- `lib/` — Server and shared logic: `db`, `auth`, `money`, `fx`, `notifications`.
- `prisma/` — Prisma schema and migrations.
- `tests/` — Unit and end-to-end tests.
- `context/` — Project specifications and progress tracking.
- `context/feature-specs/` — One spec per feature unit, written before the unit is built.
