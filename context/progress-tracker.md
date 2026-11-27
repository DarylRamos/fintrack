# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase 2 (Transactions) is in progress, since 2026-11-27. Phases 0 (Foundation, go signal 2026-11-06)
  and 1 (Auth and profiles, 2026-11-27) are complete.

## Current Goal

- Units 1.1a to 1.5 are complete and in production (unit 1.5 on 2026-11-27), which completes Phase 1.
  Unit 2.1 (money module, with amount and currency fields) is complete on `development` (`b796a42`, CI
  passed, 2026-11-27). Unit 2.2 (transaction create, edit and delete) is built, passes
  every local check and the owner's development hand checks 8.1 to 8.8 (2026-11-27), and is pushed to
  `development`. Next: CI (including the database tests), then the production migration before the merge.

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

- Units 1.1a, 1.1b, 1.2a, 1.2b and 1.3 completed on 2026-11-19. Merged into `main` together in pull
  request #5 (`c335788`); CI passed, the deployment succeeded, and the production checks passed (details
  per unit below and in each spec's Production Results).

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

  - Production checks passed on 2026-11-19 after pull request #5 (`c335788`): checks 3, 4 and 5 and the heartbeat refusal (401). Check 1 skipped (the production account
    was created with Google). Check 8 found no `Secure` flag on the session cookie (fixed; see In Progress).
    The scheduled heartbeat shows under Schedules.

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

  - Production checks passed on 2026-11-19 after pull request #5 (`c335788`): 5.1.

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
  - Committed to `development` as `4f1d005` at the owner's request; CI run 44060161743 passed (all
    three jobs) on 2026-11-17.

  - Production checks passed on 2026-11-19 after pull request #5 (`c335788`): 6.1 to 6.6.

- **Unit 1.2b** (spec approved 2026-11-18: A, standalone pages now; B, the alternative, no on-demand
  error route; C, show the reference). Done:
  - `app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`, on `components/status-page`
    (`StatusPage`, `ErrorStatus`, `errorDigest`); font definitions moved to `app/fonts.ts`.
  - Unmatched URLs answer `404` with `noindex` (confirmed on a production build); signed-out unknown app
    paths still go to sign-in first.
  - Tests: `npm test` 298 passed (14 new, in `tests/unit/status-pages.test.tsx`; Vitest now also picks up
    `.test.tsx`); lint, typecheck and build pass. Playwright on port 3100 with the test account: 104
    passed, 15 skipped (12 new, `tests/e2e/error-pages.spec.ts`).
  - The agent's temporary error check passed at both widths, light and dark; the temporary files were
    deleted and leave no trace.
  - Docs: `architecture.md`, `code-standards.md`, `ui-context.md`, the spec's Implementation Notes.

  - The owner's development hand checks 6.1 to 6.3 (404 page only) pass (2026-11-18).
  - Committed to `development` as `a8a0fc3` at the owner's request; CI run 44287078380 passed (all three
    jobs) on 2026-11-18.

  - Production checks passed on 2026-11-19 after pull request #5 (`c335788`): 6.1 and 6.2.

- **Unit 1.3** (spec approved 2026-11-18: A, failures return to `/sign-in` with a message; B, one Google
  client shared by both projects; C, owner-only for now; Facebook removed). The owner set up Google in
  both Supabase projects. Done:
  - `signInWithGoogle` (Server Action, React form-action shape, works without JavaScript),
    `app/auth/callback/route.ts`, `oauthRedirectUrl`, `GOOGLE_FAILED` and the safe provider-error logging.
  - The "or" divider and "Continue with Google" button on `/sign-in` and `/sign-up`
    (`components/auth/google-sign-in.tsx`, `google-logo.tsx`), with busy state and alert shared with the
    email form (`auth-form-status.tsx`). Both pages stay static; no Supabase code in the browser bundle.
  - Tests: `npm test` 355 passed (57 new); lint, typecheck and build pass. Playwright on port 3100 with
    the test account: 120 passed, 15 skipped (16 new, signed out, so they also run in CI).
  - Docs: `architecture.md`, `code-standards.md`, `ui-context.md`, the spec's Implementation Notes.

  - The owner's development hand checks 6.1 to 6.5 pass (2026-11-18). The first check 6.6 failed: a
    non-test Google account signed in, because Google's Testing mode admits anyone when an app asks only
    for basic scopes. Decision C corrected: the owner turned off "Allow new users to sign up" in Supabase
    (development; Manual Task 3); check 6.6 revised. No code change.

  - The revised hand check 6.6 passes (2026-11-18): a Google account with no FinTrack account is sent
    back to `/sign-in`.

  - Auth UI aligned with the owner's reference (approved 2026-11-19; decisions: round icon-only Google
    button; keep the text wordmark; no "Full name" field or Terms checkbox; keep Confirm password):
    - The brand panel's welcome text and illustration form a centred column, and the auth column is
      wider (`max-w-sm`).
    - Sign-in heading "Welcome back!"; a friendlier sign-up subtitle; placeholders on every auth field;
      "Forgot password?" below the Password field (`FormField`'s `labelAside` became `footer`).
    - "or continue with" divider; the round Google button (`socialButtonClass` replaces
      `secondaryButtonClass`); centred sign-up and sign-in links.
    - Browser tests updated for the new heading and divider text, plus a round-button check. Lint,
      typecheck, `npm test` (355) and build pass; Playwright on port 3100: 120 passed, 15 skipped.
      Screenshots checked at 375, 1024 and 1440px in light and dark mode.
    - Docs: `ui-context.md` (Sign-In and Sign-Up), the 1.3 spec's UI amendment.

  - Brand panel picture (approved 2026-11-19; decisions: one-time animation on load, shadcn charts, two
    background chart cards):
    - shadcn `chart` added (`components/ui/chart.tsx`); `recharts` pinned at 3.8.0. Phase 5 reuses it.
    - `components/auth/auth-showcase.tsx`: a laptop with a mini dashboard in front of two chart cards,
      sample data, animated once on load, still with reduced motion. `auth-showcase-loader.tsx` loads it
      only at `md` and wider (phones never download Recharts), `aria-hidden` and `inert`.
      `auth-illustration.tsx` removed.
    - New browser test: the picture is decorative, never focusable, and not loaded on phones. Lint,
      typecheck, `npm test` (355) and build pass (`/sign-in` and `/sign-up` still static); Playwright on
      port 3100: 122 passed, 15 skipped. Screenshots checked at 768, 1024 and 1440px in light and dark
      mode, mid-animation and with reduced motion.
    - Docs: `ui-context.md` (Theme motion exception; Sign-In and Sign-Up left panel).

  - The agent reran every check after the owner's UI update (2026-11-19): lint, typecheck, build,
    `npm test` 355 passed, Playwright on port 3100 122 passed, 15 skipped. Committed to `development`
    at the owner's request on 2026-11-19, with `__pycache__/` added to `.gitignore`.

  - Committed as `73a9f21` and pushed to `development` on 2026-11-19. The owner deleted the second
    development user and turned off "Allow new users to sign up" (2026-11-19). The owner merges units
    1.1a to 1.3 into `main` next.

  - Production checks passed on 2026-11-19 after pull request #5 (`c335788`): 6.1, 6.3 and 6.4. The owner created the production account with Google while
    sign-ups were briefly on, then turned them off again. A password set by reset adds no `email`
    identity in Supabase, but email and password sign-in works.

## In Progress

- **Unit 2.2: transaction create, edit and delete**
  (`context/feature-specs/2.2-transaction-create-edit-delete.md`; spec approved 2026-11-27 with the
  recommended answers to Questions A to F). Done:
  - Migration `20261127075326_transactions` (enum `transaction_type`; `transactions` with RLS on and three
    checks), applied to development; owner `prisma`, grants for `prisma` only, no policies.
  - `lib/validation/transaction.ts` (every field error in one submit, through Zod's `when`),
    `lib/db/transactions.ts` (every query by `id` and `user_id`), `lib/actions/result.ts` (shared by
    `updateProfile`, unchanged in behaviour), and the three actions in `app/(app)/transactions/actions.ts`.
  - `/transactions` (the 50 most recent, empty state, status line), `/transactions/new`,
    `/transactions/[id]/edit` (form, delete dialog), `components/transactions/*`; `PageHeader`'s `parent`
    breadcrumb; the in-shell `app/(app)/not-found.tsx` and `error.tsx` (closes the Phase 1 follow-up).
  - Two shell fixes found on the way: the sidebar's active link behind `Suspense` (the build failed on the
    first dynamic page), and `min-w-0` on the content area (long text widened pages at 768 and 1024px).
  - Tests: `npm test` 727 passed (68 new); lint, typecheck and build pass. Playwright on port 3100 with the
    test account: 149 passed, 17 skipped (13 new). The cross-user database test
    (`tests/db/transactions.test.ts`) runs on CI's `db` job at the first push.
  - Screenshots at 375 to 1440px, light and dark, checked and deleted; the test account has no
    transactions left.
  - Docs: `architecture.md`, `code-standards.md`, `ui-context.md`, the spec's Implementation Notes.
  - Development hand checks 8.1 to 8.8 passed (owner, 2026-11-27); committed and pushed to `development`.
  - Waiting for: CI (the `db` job runs the cross-user test for the first time); then the production backup
    and `migrate deploy` before the merge into `main` (Manual Task 2), which also brings unit 2.1 to `main`.

- **Unit 2.1: money module, with amount and currency fields**
  (`context/feature-specs/2.1-money-module-amount-currency-fields.md`; spec approved 2026-11-27 with the
  recommended answers to Questions A to E). Done:
  - `lib/money/currencies.ts` gains each currency's decimal places (0 for HUF, IDR, ISK, JPY and KRW, 2
    for the rest); `lib/money/amount.ts` (`parseAmountInput`, `isCanonicalAmount`; string work only) and
    `lib/money/format.ts` (`formatMoney` with a fixed `en-US` locale and `Intl`'s symbols,
    `amountPlaceholder`).
  - `lib/validation/money.ts` (`currencySchema`, `moneySchema`, `moneyShape`, `withCanonicalAmount`); the
    Profile schema reuses `currencySchema`.
  - `components/money/money-fields.tsx` (Amount and Currency, render-tested; first page and browser test
    in unit 2.2); the select style moved to `components/auth/styles.ts` (`selectClass`), and the Profile
    form is unchanged to look at.
  - No new dependency; no database, proxy, auth, cron, `vercel.json` or env change.
  - Tests: `npm test` 659 passed (128 new); lint, typecheck and build pass. Playwright on port 3100 with
    the test account: 136 passed, 16 skipped (unchanged). The temporary visual check (375, 768 and
    1440px, light and dark) passed and was deleted.
  - Docs: `architecture.md` (`lib/money`, `components/money`, invariant 1's canonical string),
    `code-standards.md`, `ui-context.md`, the spec's Implementation Notes.
  - Committed as `b796a42` and pushed to `development`; CI run 45938676677 passed (all three jobs) on
    2026-11-27. No hand checks (they start with unit 2.2's form). Complete. It reaches `main` with a later
    pull request.

- **Unit 1.5: profile and preferred currency** (`context/feature-specs/1.5-profile-and-preferred-currency.md`;
  spec approved 2026-11-25 with the recommended answers to Questions A to E). Done:
  - The first application table, `profiles` (migration `20261124193102_profiles`: RLS on, two format
    checks), applied to development; owner `prisma`, grants for `prisma` only, RLS on and not forced, no
    policies.
  - `lib/money/currencies.ts` (Frankfurter's 30 codes, checked 2026-11-25: BGN is gone), `lib/db/profiles.ts`,
    `lib/validation/profile.ts`, `updateProfile`; the `/profile` page; the account menu's name and initial,
    falling back to the email if the read fails. shadcn `native-select` added with the CLI.
  - Tests: `npm test` 531 passed (51 new); lint, typecheck and build pass (`/profile` a partial prerender).
    Playwright on port 3100 with the test account: 136 passed, 16 skipped (4 new). The cross-user
    database test (`tests/db/profiles.test.ts`) runs on CI's `db` job at the first push.
  - Found while testing: clearing the name couldn't be saved (the form sends `null`, which the action's
    schema refused); fixed, with tests.
  - Docs: `architecture.md`, `code-standards.md` (schema conventions), `ui-context.md`, the spec's
    Implementation Notes.
  - The owner's development hand checks 7.1 to 7.6 pass (2026-11-25).
  - Production backup taken and the `profiles` migration applied by the owner (2026-11-25); owner, grants,
    RLS and constraints as expected. Security Advisor's only Warning is the known leaked-password one
    (paid plan only).
  - Committed as `175a669`; CI green on `development` (including the first `db` run of the cross-user
    test); merged into `main` with pull request #8 (2026-11-26).
  - Production checks 7.1 to 7.3 pass (2026-11-27). Complete.

- **Unit 1.4: authenticator-app 2FA** (`context/feature-specs/1.4-authenticator-app-2fa.md`; spec
  approved 2026-11-23 with the recommended answers to Questions A to F). Done:
  - `lib/auth/assurance.ts` (session states `signed-out`, `needs-2fa`, `signed-in`; factors read from
    Supabase, failing closed); the proxy, `routeDecision`, `requireUser()`, new `getSignedInUser()`,
    `getSessionStatus()` and `getTwoFactorStatus()`; `twoFactorPath`, `safeTwoFactorNext`.
  - `signIn` and `/auth/callback` go to `/two-factor` with 2FA on; `verifyTwoFactor`; `updatePassword`
    refuses `needs-2fa`. The `/two-factor` page (static).
  - `/settings` with the Security section: set up (QR code, setup key, code), cancel, turn off with a
    current code (`app/(app)/settings/actions.ts`, `components/settings/*`); shadcn `dialog` added.
  - Tests: `npm test` 480 passed (110 new); lint, typecheck and build pass. Playwright on port 3100 with
    the test account: 131 passed, 15 skipped (9 new, including the real 2FA flow on the
    development account, local only).
  - Found while building: verifying a factor signs out the user's other sessions (Supabase), so hand
    check 7.5 now expects `/sign-in`; Supabase's QR SVG has an XML header and comment (fixed).
  - Docs: `architecture.md`, `code-standards.md`, `ui-context.md`, the spec's Implementation Notes.

  - The owner's development hand checks 7.1 to 7.9 pass (2026-11-23).
  - After the hand checks: one development test account for every e2e test (the owner's own account is
    for hand checks); the Settings look tightened, and `ui-context.md` now has an app-wide two-size
    radius scale (owner's approval, 2026-11-24).
  - Committed as `e501f07` and pushed to `development`; pull request #7 merged it into `main` as
    `134857a`, and CI passed (2026-11-24).
  - Production checks 7.1, 7.2, 7.3, 7.5 and 7.6 pass, with the setup key saved (2026-11-24). The owner's
    local Playwright run with the one test account passes. Complete.

- **`Secure` on the Supabase session cookies** (found by 1.1a check 8 on production, 2026-11-19; fixed
  the same day without a separate spec, owner's decision). `@supabase/ssr`'s default cookie options have
  no `secure`. New `lib/auth/cookie-options.ts` (`sessionCookieOptions`): `Secure` when the request came
  over HTTPS. `lib/auth/server.ts` and `lib/auth/proxy-session.ts` pass it as `cookieOptions`.
  - Tests: `tests/unit/session-cookie-options.test.ts` (15 new); `npm test` 370 passed; lint, typecheck
    and build pass; Playwright on port 3100: 122 passed, 15 skipped (signed-in tests still work over
    plain `http://localhost`).
  - Docs: `architecture.md` (Session cookie flags), `code-standards.md` (Auth), the 1.1a and 1.3 specs'
    Production Results.

  - Committed as `a99ec90`, pushed to `development`, and merged into `main` (2026-11-19). On production,
    after signing in again, the `sb-…-auth-token` cookie shows `Secure` and `SameSite=Lax`. Complete.

- **Pause check (unit 0.7 follow-up): done 2026-11-23.** The owner reported that the scheduled
  `heartbeat` ran and production is still active, not paused, after 8 daily runs (from 2026-11-16). So a
  daily `SELECT 1` counts as enough activity for now. If a pause or a warning email ever appears, restore
  the project and open a small unit to make the heartbeat more realistic or more frequent.

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
- [x] Documented `pg_dump` routine; confirm backup and project-pause behavior (pause check passed 2026-11-23)

Phase 0 follow-ups for Phase 2 (from unit 0.7):

- [ ] A Storage backup routine for receipts. Database dumps don't include Storage files.
- [ ] A full restore drill, into the development project or a throwaway local Postgres 17 server.
- [ ] Decide on a second, off-machine copy of the backups.

**Phase 1: Auth and profiles**

- [x] Email sign-up, log-in, log-out and password reset (unit 1.1a: complete 2026-11-19)
- [x] Reset link works again in the same browser until the password changes or 1 hour passes (unit
      1.1b, `context/feature-specs/1.1b-reset-link-reclick.md`: complete 2026-11-19)
- [x] Route protection through `proxy.ts`, plus server-side session helpers (unit 1.2a,
      `context/feature-specs/1.2a-route-protection-session-helpers.md`: complete 2026-11-19)
- [x] Custom 404 and 500 error pages (unit 1.2b, `context/feature-specs/1.2b-http-error-pages.md`: complete
      2026-11-19)
- [x] Google sign-in (unit 1.3, `context/feature-specs/1.3-google-sign-in.md`: complete 2026-11-19)
- [x] `Secure` flag on the Supabase session cookies (follow-up from 1.1a check 8: in production,
      checked 2026-11-19)
- [x] Authenticator-app 2FA, enforced for every sign-in method (unit 1.4,
      `context/feature-specs/1.4-authenticator-app-2fa.md`: complete 2026-11-24)
- [x] Profile with preferred currency (unit 1.5, `context/feature-specs/1.5-profile-and-preferred-currency.md`:
      complete 2026-11-27). Notification preferences moved to Phase 6
      (owner's decision on 2026-11-25, Question A).

Phase 1 follow-up for Phase 2 (from unit 1.2b):

- [x] Add `app/(app)/error.tsx` and `app/(app)/not-found.tsx` with the first data page, reusing
      `components/status-page` inside the app shell (unit 2.2, 2026-11-27).

**Phase 2: Transactions**

- [x] Money module, with amount and currency fields (unit 2.1,
      `context/feature-specs/2.1-money-module-amount-currency-fields.md`: complete 2026-11-27, on
      `development`)
- [ ] Transaction create, edit and delete (unit 2.2, `context/feature-specs/2.2-transaction-create-edit-delete.md`:
      built 2026-11-27, development hand checks passed; waiting for CI and the production migration)
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
- [ ] Budget alerts and significant-transaction alerts, with the notification preferences (moved from
      Phase 1 by unit 1.5: which alerts are on, and the significant-transaction amount)
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

- Phase 2: Which currencies does the owner need? **Answered 2026-11-25 (unit 1.5, Question C):** the owner
  accepted Frankfurter's list (30 codes), which is what the Profile page offers; others would need manual
  rates or another provider.
- Phase 1: Schema naming conventions. **Decided 2026-11-25 (unit 1.5, Question D)**; recorded in
  `code-standards.md` → Prisma.
- Phase 3: Which decimal library does conversion use? Proposed: `decimal.js` (unit 2.1, Question B).
- Phase 3: Which rate applies to dates with no published rate? Proposed: the most recent
  earlier rate.
- Phase 4: Which frequencies do recurring rules support? Proposed: weekly, every two weeks,
  monthly and yearly.
- Phase 6: Which budget periods are supported? Proposed: monthly.
- Phase 6: At what usage does "nearing a budget" begin? Proposed: 80%.
- Phase 6: What is the default significant-transaction amount?
- Phase 9: Should investment prices ever come from a price feed? Default: manual entry only.
- Phase 12: What should privacy settings control, given that no data is shared with anyone?
- Phase 12: Should FinTrack open to other users? Today no one else can create an account: Supabase's
  "Allow new users to sign up" is off (unit 1.3), and Supabase's built-in email only sends to the Supabase
  team. Opening sign-up means turning that switch back on, ideally after a privacy policy page; Google's
  "Publish app" (brand verification optional) removes its testing notice. Opening email sign-up needs custom SMTP, which Resend can only provide with a verified
  domain (likely a paid domain), so it needs the owner's approval. Decide both together.
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
- **Email and Google sign-in only:** Owner's decision. Phone sign-in is out of scope, which also
  avoids SMS costs. Facebook was removed on 2026-11-18 (owner's decision, unit 1.3): Google covers the
  same need, and Facebook would have needed a Meta app plus a privacy policy and Meta's review to open
  it to anyone.
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
- **Standalone 404 and error pages; no on-demand error route:** owner's decisions on 2026-11-18 (unit
  1.2b, Questions A and B). The pages have no sidebar for now; Phase 2's first data page adds in-shell
  versions. Nothing that can crash a page ships, so the error page has render tests and the agent's
  one-off check, but no browser test. The error page shows the `digest` as a reference (Question C).
- **Signed-in browser tests use a development test account, local only:** owner's decision on
  2026-11-17 (unit 1.2a, Question B). `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` live in `.env.local`
  only, never in Vercel or GitHub; CI skips the signed-in tests. Revisited in unit 1.4: kept, with no
  local stack in CI, plus a second local-only account for the 2FA flow.
- **Google sign-in through a Server Action and `/auth/callback`; owner-only for now:** owner's decisions
  on 2026-11-18 (unit 1.3). Failures return to `/sign-in` with one message (A); one Google OAuth client
  serves both Supabase projects, its secret only in Supabase (B); Google's app stays in Testing with the
  owner as the only test user (C). Same-email Google accounts link automatically (Supabase's default).
  **C corrected on 2026-11-18** (hand check 6.6): Testing mode doesn't limit an app asking only for basic
  scopes, so owner-only is enforced by turning off Supabase's "Allow new users to sign up" in both
  projects (owner's choice over leaving sign-up open or an app-code allowlist).
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
  **Decided 2026-11-20 (unit 1.4, Question E):** no local stack in CI. The real 2FA flow runs locally only.
  **Changed 2026-11-23 (owner):** one test account for every browser test (`E2E_USER_*`, set to the
  second development account, 2FA off); the owner's own account is for hand checks. The flow test runs
  last, in its own Playwright project.
- **Authenticator-app 2FA (unit 1.4):** owner's decisions on 2026-11-20 and 2026-11-23, all the
  recommended options. A: factors read from Supabase (`getUser()`) only for `aal1` sessions, no Custom
  Access Token hook. B: a Security section on `/settings`. C: one TOTP factor; recovery is the setup key in
  the password manager, then the Supabase dashboard. D: turning 2FA off needs a current code. E: as above.
  F: a `needs-2fa` browser on a guest page goes to `/two-factor`, which offers Sign out.

- **Profile and preferred currency (unit 1.5):** owner's decisions on 2026-11-25, all the recommended
  options. A: notification preferences move to Phase 6, with the alerts they control. B: a display name
  only (optional, 50 characters), beside the read-only email. C: Frankfurter's currencies, default USD.
  D: the schema conventions in `code-standards.md`. E: the name in the account menu and the avatar now; the
  "Hi, <name>" greeting in Phase 6. The `profiles` row is created on the first save, with no trigger on
  `auth.users`.

- **Money module (unit 2.1):** owner's decisions on 2026-11-27, all the recommended options. A: the Amount
  and Currency fields are built now and render-tested; their browser test comes with 2.2. B: no decimal
  library until Phase 3's conversion (likely `decimal.js`); Phase 2 needs no arithmetic, and sums run in
  Postgres. C: amounts above 0, up to 999,999,999,999, always positive (direction is the transaction's
  type). D: decimal places as `Intl` shows them (none for HUF, IDR, ISK, JPY and KRW), fixed in the app.
  E: `Intl`'s standard symbols, locale fixed at `en-US` until Phase 14.

- **Transactions (unit 2.2):** owner's decisions on 2026-11-27, all the recommended options. A: separate
  new and edit pages, not a dialog. B: a new transaction's date starts at the browser's today; no time zone
  setting until Phase 4 needs one. C: dates from 1 Jan 2000 to one year ahead. D: a required description,
  up to 100 characters. E: the list shows the 50 most recent until 2.4. F: a status line from `?done=`, no
  toast library. Delete is permanent after a confirmation; another user's transaction answers 404.

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
  production `*.vercel.app` URL must be added to Supabase Auth (done as the Site URL in unit 1.1a). The
  Google client (unit 1.3) only needs the Supabase callback URLs, not the app's URL.
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
