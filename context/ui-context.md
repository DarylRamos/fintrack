# UI Context

This file is the source of truth for FinTrack's UI. It is based on the owner's two reference
images (sign-in page and dashboard shell, from the Purity UI Dashboard template) and refined
with the UI UX Pro Max skill. Where a skill suggestion conflicts with this file, this file wins.

## Theme

Minimalist and monochrome, in the Swiss style: clean, spacious, grid-based and high contrast.
The interface should feel calm, so the user's numbers stand out.

- **Monochrome first:** white surfaces, dark slate and near-black. There is no brand accent
  color.
- **Color carries meaning:** only state colors (error, warning, success) add hue.
- **Whitespace over containers:** separate content with spacing first, then thin borders.
  Avoid gradients and heavy shadows.
- **Soft, rounded shapes, in two sizes:** pill buttons on the sign-in and error pages, as in the
  reference; inside the app, compact controls with gently rounded corners, so content and figures
  stay the focus (owner's choice on 2026-11-24, from the Settings rework in unit 1.4).
- **Few elements per screen:** one primary action per view. Reach any core function with
  minimal clicks.
- **Quiet motion:** 150-250ms transitions on color and opacity for hover and state changes.
  No scroll animations. Respect `prefers-reduced-motion`. One exception: the sign-in panel's
  picture plays a one-time entrance animation on load (about 1.5s, then still); see Sign-In and
  Sign-Up.

The reference shows light mode only. Dark mode is derived from it and follows the system
setting. Release 2 adds a theme choice in settings.

## Colors

All components use these CSS custom properties, with no hardcoded hex values. There are two exceptions.
The Google "G" logo (`components/auth/google-logo.tsx`) keeps its brand colours in both modes because
Google's guidelines forbid recolouring it. The 2FA setup's QR code sits on a white tile (`bg-white`) in
both modes, because QR codes need dark modules on a light background to scan (unit 1.4). Map shadcn/ui's
semantic tokens (such as `--background`, `--primary` and `--sidebar`) to these in
`app/globals.css`.

Light values live in `:root`, and dark values in `@media (prefers-color-scheme: dark)`. This also
matches Tailwind's default `dark:` behavior, and needs no JavaScript or theme library. Phase 14 adds
a `.dark` class for the manual theme choice.

| Role                       | CSS Variable           | Light     | Dark      |
| -------------------------- | ---------------------- | --------- | --------- |
| Page background            | `--bg-base`            | `#FFFFFF` | `#0B0D11` |
| Surface (cards, sidebar)   | `--bg-surface`         | `#FFFFFF` | `#15181E` |
| Muted fill (inputs, hover) | `--bg-muted`           | `#F1F4F8` | `#1E222A` |
| Slate panel, active nav    | `--bg-inverse`         | `#373D49` | `#2A303A` |
| Primary text               | `--text-primary`       | `#171717` | `#F4F5F7` |
| Muted text, placeholders   | `--text-muted`         | `#5B6472` | `#A3ACB9` |
| Text on slate              | `--text-on-inverse`    | `#FFFFFF` | `#F4F5F7` |
| Muted text on slate        | `--text-on-inverse-muted` | `#CBD5E1` | `#CBD5E1` |
| Primary button             | `--action-primary`     | `#111111` | `#F4F5F7` |
| Text on primary button     | `--action-contrast`    | `#FFFFFF` | `#111111` |
| Border, divider            | `--border-default`     | `#E5E7EB` | `#2A303A` |
| Focus ring                 | `--focus-ring`         | `#373D49` | `#F4F5F7` |
| Main chart series          | `--chart-primary`      | `#373D49` | `#F4F5F7` |
| Comparison chart series    | `--chart-secondary`    | `#8A94A3` | `#7C8594` |
| Error / over budget        | `--state-error`        | `#B91C1C` | `#F87171` |
| Warning / nearing limit    | `--state-warning`      | `#B45309` | `#FBBF24` |
| Success                    | `--state-success`      | `#15803D` | `#4ADE80` |

Text pairs must meet WCAG AA at 4.5:1, and chart series and focus rings 3:1. Recheck any changed
color in both modes.

### Tailwind Utility Names

Use these color names with any Tailwind prefix, such as `bg-`, `text-`, `border-` or `stroke-`:

| Name                                  | Token                                          |
| ------------------------------------- | ---------------------------------------------- |
| `page`, `surface`, `fill`, `inverse`  | `--bg-base`, `--bg-surface`, `--bg-muted`, `--bg-inverse` |
| `ink`, `ink-muted`                    | `--text-primary`, `--text-muted`               |
| `on-inverse`, `on-inverse-muted`      | `--text-on-inverse`, `--text-on-inverse-muted` |
| `action`, `on-action`                 | `--action-primary`, `--action-contrast`        |
| `line`, `focus`                       | `--border-default`, `--focus-ring`             |
| `chart-primary`, `chart-secondary`    | `--chart-primary`, `--chart-secondary`         |
| `error`, `warning`, `success`         | `--state-error`, `--state-warning`, `--state-success` |

These names avoid `base`, which would clash with the `text-base` font size, and shadcn's own names
(`primary`, `muted`, `accent`, `border`, `ring`).

### shadcn/ui Variables

shadcn's semantic variables are defined once in `app/globals.css`, each pointing at a token above, so
they follow dark mode with no second copy. Generated components therefore use FinTrack colors.

| shadcn variable                                        | Token               |
| ------------------------------------------------------ | ------------------- |
| `--background`                                         | `--bg-base`         |
| `--card`, `--popover`, `--sidebar`                     | `--bg-surface`      |
| `--secondary`, `--muted`, `--accent`, `--sidebar-accent` | `--bg-muted`      |
| `--sidebar-primary`                                    | `--bg-inverse`      |
| `--foreground` and the `*-foreground` variables of the above | `--text-primary` |
| `--muted-foreground`                                   | `--text-muted`      |
| `--sidebar-primary-foreground`                         | `--text-on-inverse` |
| `--primary`, `--primary-foreground`                    | `--action-primary`, `--action-contrast` |
| `--destructive`                                        | `--state-error`     |
| `--border`, `--input`, `--sidebar-border`              | `--border-default`  |
| `--ring`, `--sidebar-ring`                             | `--focus-ring`      |
| `--chart-1`, `--chart-2`                               | `--chart-primary`, `--chart-secondary` |

`--chart-3` to `--chart-5` are not defined yet; Phase 5 decides them. shadcn's `--radius-*` overrides
are removed, so Tailwind's built-in radius classes keep their standard sizes. `--radius` stays at
`0.5rem` only for generated components that read it.

## Typography

| Role      | Font       | Variable      |
| --------- | ---------- | ------------- |
| UI text   | Geist Sans | `--font-sans` |
| Code/mono | Geist Mono | `--font-mono` |

`app/layout.tsx` loads these as `--font-geist-sans` and `--font-geist-mono`. Map them to the
variables above in the Tailwind theme.

- **Sizes:** `text-sm` for body and tables; `text-[13px]` for sidebar navigation; `text-xl` or `text-2xl` for page titles;
  `text-2xl` or `text-3xl` for key totals; `text-4xl` for the sign-in panel heading.
- **Minimum:** 12px for any text, including helper links and breadcrumbs.
- **Inputs:** `text-base` on phones, to stop iOS zooming on focus, and `md:text-sm` above that.
- **Weights:** `font-normal` for body, `font-medium` for labels and navigation, and
  `font-semibold` for titles and key totals.
- **Numbers:** `tabular-nums` on all money and numeric columns.

## Border Radius

| Context                                                        | Class          |
| -------------------------------------------------------------- | -------------- |
| Inputs, small UI, state tags, the setup key box                | `rounded-md`   |
| Navigation items and icon tiles                                | `rounded-lg`   |
| In-app buttons and icon buttons, inner panels, the QR tile     | `rounded-lg`   |
| In-app cards and dialogs                                       | `rounded-xl`   |
| Sign-in picture cards (decorative)                             | `rounded-2xl`  |
| Buttons on sign-in and error pages, the Google button, avatar  | `rounded-full` |

One scale for every app page, so pages stay consistent; a new page doesn't add its own radius.

## Elevation

Flat by default. Cards use a 1px border. The only shadow is a faint one on small floating
elements, such as social buttons, navigation icon tiles and menus (`shadow-sm` in light mode). In
dark mode, these use a border instead.

## Component Library

shadcn/ui on top of Tailwind. Components live in `components/ui/`. Use the CLI to add new
components rather than writing them from scratch, and restyle through tokens rather than editing
generated files. Use shadcn's `Sidebar` with `SidebarProvider` at the layout level for the app
navigation.

- **Primary button:** `--action-primary` fill and `font-medium`. Use one per view. On sign-in and
  error pages it is `rounded-full`, `h-11` and full width. Inside the app it is `rounded-lg`, as wide
  as its label, and `h-11` (44px) on phones but `h-9` (36px) from `sm` up.
- **Secondary buttons:** outline or ghost, with the same shape and size rules as the primary button.
- **Destructive buttons** (such as Turn off): a quiet outline with a `--border-default` border and
  `--state-error` text, whose border turns `--state-error` on hover. Never a filled red button. The
  label says what it does.
- **Inputs:** `--bg-muted` fill with no resting border, `rounded-md`, `h-11`, with a visible label
  above and a 2px `--focus-ring` on focus. On error, add a `--state-error` border.
- **Forms:** one column, with labels never replaced by placeholders, and errors directly under the
  field. Submit buttons show loading and then a success or error result.
- **Cards:** surface color, 1px border and `rounded-xl` inside the app.
- **Tables:** thin row dividers, with no zebra stripes or vertical borders.
- **Empty states:** one short sentence and one action.
- **Focus:** always visible on interactive elements, with a 2px ring and 2px offset.
- **Clickable elements:** `cursor-pointer`, with a hover state.

## Layout Patterns

### Sign-In and Sign-Up

- **Desktop:** a 50/50 split at full viewport height.
- **Left panel:** `--bg-inverse`, with the FinTrack text wordmark at top left. Below it, a centred
  column (`max-w-sm`, text left-aligned) holds "Welcome to FinTrack!" and one short supporting line
  ("Your income, spending and goals, all in one calm place."), then, further down, a picture
  (`max-w-lg`, 6:5) of a laptop showing a small FinTrack dashboard, in front of two chart cards that it
  partly covers (owner's choice on 2026-11-19, replacing unit 1.1a's line illustration):
  - **Laptop:** drawn with CSS; bezel `--text-primary` (light) or `--bg-surface` with a border (dark),
    base `--text-on-inverse-muted`. The screen follows the app shell and the planned dashboard:
    sidebar with the active item, page header and avatar, four summary tiles, a balance area chart and
    budget bars (one in `--state-warning`). Text is drawn as bars, so none falls under 12px; sizes use
    container units so it scales with the panel.
  - **Cards (right, behind):** surface cards, 1px border, `rounded-2xl`: income against spending (line
    chart, solid `--chart-primary` and dashed `--chart-secondary`) and spending by category (sorted
    horizontal bars on a `--bg-muted` track).
  - **Charts:** shadcn charts (Recharts), sample figures only, no tooltips, `accessibilityLayer` off.
  - **Motion:** once on load, the laptop fades up, the cards slide in from the right (150ms and 300ms
    later), and the charts draw in (from about 300 to 1700ms). Then everything is still. With reduced
    motion it appears without moving.
  - **Loading and access:** `components/auth/auth-showcase-loader.tsx` loads the picture
    (`auth-showcase.tsx`) only in the browser at `md` and wider, so phones never download Recharts and
    the auth pages stay static; its box keeps its size first, so nothing shifts. The wrapper is
    `aria-hidden` and `inert`: decorative and never focusable.
- **Right panel:** a centered column about 384px wide (`max-w-sm`), shared by every auth page.
  - **Sign in:** "Welcome back!" with "Sign in to see your income, spending and goals.", Email and
    Password fields, "Forgot password?" right-aligned below the Password field (after any field error),
    a full-width sign-in button, the "or continue with" divider, the round Google button, then
    "Don't have an account? Sign up", centred.
  - **Sign up:** "Create your account" with "Get started in just a few minutes. We'll email you a link
    to confirm your account.", then the form, divider, Google button and "Already have an account? Sign
    in", centred.
  - Updated to follow the owner's reference more closely on 2026-11-19 (unit 1.3).
- **Placeholders:** short hints in addition to the visible labels ("Type your email", "Type your
  password", "Create a password", "Type your password again"), in `--text-muted`.
- **Password fields:** a show/hide button inside the field, with an accessible name ("Show password" /
  "Hide password"). New-password fields show the rule as helper text under the field.
- **Form errors:** field errors under the field, checked on submit and then as the user types, never on
  blur (an error appearing on blur shifts the centred form and makes the next click miss); a form-level error (such as a wrong password) in a
  bordered `--state-error` alert above the fields, with an icon, announced and focused when it appears.
- **Clean URLs:** the auth layout removes Supabase's `#error=…` fragment from the address bar
  (`ClearAuthErrorHash`, unit 1.1b), so the URL never contradicts the page.
- **Split point:** the 50/50 layout starts at `md` (768px).
- **Google button:** a round icon-only button, centred (`socialButtonClass`): `size-12` (48px),
  `rounded-full`, `--bg-surface` with a 1px `--border-default` border, `shadow-sm` in light mode only, a
  `--bg-muted` hover and the Google "G" logo (`h-5 w-5`). Its accessible name and hover tooltip are
  "Continue with Google" (unit 1.3). While it or the email form is working, both are disabled; the
  pressed Google button shows a spinner in place of the logo, and its name becomes "Redirecting to
  Google…". Its errors use the form's alert. Owner's choice on 2026-11-19, matching the reference; it
  replaces the full-width labelled button first built in unit 1.3.
- **Divider:** "or continue with" in `text-xs` muted text between two thin `--border-default` lines.
- **Phones:** the left panel is hidden, and the logo sits above the form.
- **Copy:** real product text, never placeholder text.

### App Shell

- **Sidebar:** fixed, `w-60` (`--sidebar-width: 15rem`), on `--bg-surface`, separated from content by
  whitespace rather than a border. The logo sits at the top with a faint divider below it. Until a
  logo file exists, the logo is a "FinTrack" text wordmark in `font-semibold`.
- **Active navigation item:** a `--bg-inverse` `rounded-lg` highlight with `--text-on-inverse` text, and a small
  `--bg-surface` icon tile holding a `--text-primary` icon. The icon is not slate, because slate is too
  dark against the tile in dark mode.
- **Inactive navigation item:** primary text, with the icon in a `--bg-surface` tile (`shadow-sm` in
  light mode, a `--border-default` border in dark mode), and a `--bg-muted` hover.
- **Item size:** at least `h-11`, always with an icon and text label.
- **Main navigation:** Dashboard, Transactions, Budgets, Goals, Reports, Investments, Debts.
- **"ACCOUNT" group:** a small uppercase label, then Profile and Settings.
- **Help card:** a `--bg-inverse` card at the bottom of the sidebar with a white in-app button. Add it
  in Phase 16, when the help center exists, and never link to a missing page.
- **Sign out:** in the user menu, away from the main navigation.
- **Phones:** a compact top bar with the sidebar as a slide-over menu, and at least 44px touch targets
  with 8px gaps.

### Page Header

- **Left:** a breadcrumb (such as "Home / Dashboard") in small text, with the current page in
  `font-medium`, and the page title below it. Sub-pages add their parent as a link ("Home / Transactions /
  Add transaction", `PageHeader`'s `parent`, unit 2.2).
- **Right:** "Hi, <name>", avatar, settings and notifications. Since unit 1.1a: a round `--bg-inverse`
  avatar with the email's first letter (`size-11`, accessible name "Account menu"), opening a menu with
  the email and "Sign out". Since unit 1.5 the avatar shows the display name's first letter (else the
  email's), and the menu shows the name (`font-medium`) above the email (muted, `text-xs`), or "Signed
  in as" and the email without a name; long names truncate. Signed-out browsers can't reach app pages
  (unit 1.2a), so there is no signed-out state. It streams in behind `Suspense` with a
  same-size skeleton. The app layout renders it once at the top right of the content area, aligned with
  the header's first row, so it stays in place across navigations; the page header reserves room for it
  (`pr-14`: the 44px avatar plus a 12px gap). Every app page starts with the page header. The "Hi, <name>" greeting arrives with the
  settings and notification icons in Phase 6, when that room is redesigned (owner's choice, unit 1.5,
  Question E); widen the reserved room then.
- **Icon buttons:** each has an accessible name. The bell shows an unread count, announced to screen
  readers.

### Two-Factor Step (`/two-factor`)

- In the auth layout (brand panel at `md` and wider), unit 1.4. Heading "Enter your code", subtitle "Open
  your authenticator app and enter the 6-digit code for FinTrack."
- One field, **Authentication code** (`CodeInput`: numeric keypad, `one-time-code` autofill, placeholder
  "Type the 6-digit code", autofocused), one field rather than six boxes. The full-width primary
  **Verify** ("Verifying…"). Below, centred muted text "Not you, or can't use your app right now?" with a
  **Sign out** text button (a plain form, so it works without JavaScript).
- A wrong code shows the form alert ("That code didn't work. Check your authenticator app and try
  again.") and empties the field.

### Settings

- The page header "Settings", then one card per section (`rounded-xl`, 1px border, surface). Unit 1.4
  adds the first, **Security**: its `h2`, a divider, then the "Two-factor authentication" row.
- **The row:** the name with a state tag (`rounded-md`; text "On" on `--bg-inverse`, "Off" on
  `--bg-muted`; the word carries the meaning, not colour), one muted line, "Added <date>" (`Intl`, such
  as "23 Nov 2026") when on, and the action at the right (under the text on phones): **Set up**
  (primary) or **Turn off** (destructive), both in-app buttons sized to their label. The row streams in
  behind `Suspense` with a same-size skeleton.
- **Setup panel** (inside the card, `rounded-lg` border, steps capped at `max-w-md`): "Set up your
  authenticator app" (focused when it opens), then 1. the QR code (176px on a `rounded-lg` white tile with
  a 16px quiet zone) and "Can't scan it? Enter this setup key instead:" with the key in `font-mono`,
  grouped in fours, selectable, in a `rounded-md` box, and a square `rounded-lg` **Copy setup key** icon
  button (44px on phones, 36px from `sm` up; announces "Setup key copied"); 2. the **Code** field with
  **Turn on** (primary) and **Cancel** (outline). On phones the buttons stack, primary on top.
- **Turn-off dialog:** shadcn `Dialog` (`rounded-xl`) with title "Turn off two-factor authentication?",
  one line, the **Code** field, **Cancel** (outline) and **Turn off** (destructive), right-aligned from
  `sm` up.

### Profile

- The page header "Profile", then one card, **Personal details** (same card as Settings: `rounded-xl`, 1px
  border, surface, `h2`, divider), unit 1.5. Its content is capped at `max-w-md`.
- **Email:** text, not a field ("Email" label, the address, then muted `text-xs` "You sign in with this
  email.").
- **Display name** (optional): placeholder "Type your name", helper "Shown in your account menu.",
  at most 50 characters.
- **Preferred currency:** shadcn `NativeSelect` (a native `<select>`, so phones use their own picker),
  restyled from its wrapper to match the inputs (`--bg-muted` fill, no resting border, `rounded-md`,
  `h-11`, `text-base` on phones). Options read "SGD – Singapore Dollar", sorted by code. Helper:
  "FinTrack shows totals in this currency. Your transactions keep their own currency."
- **Save:** the in-app primary button ("Saving…" while busy). After a save, a polite status "Saved" with
  a `--state-success` check icon appears beside it for about 4 seconds; the word carries the meaning.
  Errors follow the form rules (field errors under the field; the form alert for a failed save).
- The form streams in behind `Suspense` with a same-size skeleton; the page shell is static.

### Transactions

Unit 2.2. The list waits for 2.4's full history table, filters and paging.

- **List page:** the page header "Transactions"; a toolbar with the polite status line on the left and the
  in-app primary **Add transaction** (`Plus` icon) on the right from `sm` up (on phones the button is full
  width, the status line under it). Below, one card of rows with thin dividers: the 50 most recent, latest
  date first, with "Showing your 50 most recent transactions." under it when more exist.
- **Row:** one link to its edit page (at least 56px tall, `--bg-muted` hover, inset focus ring), with an
  accessible name such as "Groceries, expense, -SGD 45.00, 27 Nov 2026". Left: the description
  (`font-medium`, truncated), then the date ("27 Nov 2026", `en-GB`) and "Expense" or "Income" in muted
  `text-xs`. Right: the amount, `tabular-nums`, an expense with a minus sign and an income with a plus
  sign, both in `--text-primary` (the sign and the word carry the meaning). The same row on phones.
- **Empty state:** "No transactions yet." and **Add transaction**, in the card; the toolbar's button is
  left out.
- **Status line:** "Transaction added.", "Changes saved." or "Transaction deleted." with a `--state-success`
  check, from the `?done=` parameter, which the page removes from the address bar. It takes no room while
  empty.
- **New and edit pages:** the header "Add transaction" / "Edit transaction" with the Transactions
  breadcrumb, then one card, its form capped at `max-w-xl`: **Type**, **Amount** and **Currency**, **Date**,
  **Description**, then the primary **Add transaction** / **Save changes** ("Saving…") and an outline
  **Cancel** link (stacked full width on phones, primary on top).
- **Type control:** "Expense" and "Income" as a segmented control: native radios in a `fieldset` (legend
  "Type"), one `rounded-md` `--bg-muted` track (`h-11`, full width on phones, `w-64` from `sm`), each option
  `rounded-sm`; the chosen one in `--action-primary` with `--action-contrast` text (slate was too close to
  the track in dark mode), the others with a `--bg-surface` hover. Starts at Expense.
- **Date:** a native `<input type="date">` styled as the inputs (`w-56` from `sm`), so phones use their own
  picker. A new transaction starts at the browser's today.
- **Description:** placeholder "What was it for?", at most 100 characters.
- **Delete** (edit page only): below a divider, the destructive outline **Delete transaction**, opening a
  `Dialog`: "Delete this transaction?", "It's removed for good. This can't be undone.", **Cancel** (outline)
  and **Delete** (destructive, "Deleting…").
- The list and the forms stream in behind `Suspense` with same-size skeletons; the page shells are static.

### Status Pages (404 and Error)

- Standalone, with no sidebar or brand panel: a centred column about 320px wide (`max-w-80`), at full
  viewport height on `--bg-base`, with text centred (unit 1.2b, `components/status-page`).
- Top to bottom: the "FinTrack" wordmark; a short label in `text-sm font-medium` muted text ("Error
  404", "Error"); the title as the only `h1`, `text-2xl font-semibold`; one muted sentence; the actions;
  then, on error pages only, "Reference: <digest>" in `text-xs font-mono` muted text.
- Actions: one primary pill ("Go to home" on the 404, "Try again" on errors) and at most one outline
  pill ("Go to home"), both full width and `h-11`.
- No icon, illustration or state colour. Error pages focus their title when they appear.
- Inside the app shell (unit 2.2, `app/(app)/not-found.tsx` and `error.tsx`), the same content replaces the
  page body and keeps the sidebar, without the wordmark or a second `<main>`, starting below the account
  menu rather than centred in the viewport.

### Content

- **Container:** a maximum width of about `max-w-6xl`, 16px side gutters on phones, and no horizontal
  page scroll. Check at 375, 768, 1024 and 1440px.
- **Dashboard:** a row of up to four summary figures, then charts, then budget and goal summaries.
- **Lists:** filters above the table. On phones, tables become stacked rows.
- **Create and edit:** a dialog for short forms and a separate page for longer ones. Transactions use pages
  (unit 2.2, Question A), since categories, tags, notes and a receipt join the form later.
- **Modals:** centred, with a dimmed backdrop (shadcn's default adds a light blur), `rounded-xl`. Buttons
  are right-aligned from `sm` up; on phones they stack with the main action on top.
- **Spacing:** Tailwind's 4px scale, with `gap-6` to `gap-8` between sections.

## Reference Items Not Used

| In the reference                       | In FinTrack                                                  |
| -------------------------------------- | ------------------------------------------------------------ |
| Phone number sign-in                   | Email only; phone sign-in is out of scope                    |
| Apple and Facebook sign-in buttons     | Google only                                                  |
| Tables, Billing, RTL navigation items  | Replaced with FinTrack's features                            |
| Sign In and Sign Up in the sidebar     | Removed, as signed-in users don't need them                  |
| Filled icons                           | Lucide stroke icons                                          |
| Very small helper text                 | At least 12px, for readability                               |
| "Pages" breadcrumb root                | "Home", which is more meaningful                             |

## Money and Data Display

- Right-align amounts in tables.
- Format amounts and dates with `Intl`, using thousands separators and the currency's standard
  decimal places.
- Amounts print through `formatMoney` (unit 2.1): locale fixed at `en-US` until Phase 14, `Intl`'s own
  symbols (`$1,234.50` for USD, `A$`, `€`, `₱`, `¥`…; other currencies show the code with a no-break
  space, `SGD 1,234.50`), and the app's decimal places (none for HUF, IDR, ISK, JPY and KRW). A negative
  reads `-SGD 45.00`.
- **Amount and Currency fields** (`components/money/money-fields.tsx`): Amount is the standard input,
  `inputMode="decimal"`, `tabular-nums`, placeholder `0.00` (or `0`), never reformatted while typing;
  Currency is the Profile page's select ("SGD – Singapore Dollar"). Stacked on phones, side by side from
  `sm` up (`sm:grid-cols-[1fr_14rem]`). After a submit, changing the currency checks the amount again.
- Never convey meaning by color alone: expenses and negatives carry a minus sign, and budget states
  include text or an icon.
- For a foreign-currency transaction, show the original amount and the converted amount.
- Show the rate date wherever converted totals appear, such as "Rates as of 4 Nov 2026".
- Budget indicators use slate while under the alert level, warning when nearing the limit and error
  when over it.
- Reserve space for loading content with skeletons, to avoid layout shift.

## Charts

- Show one idea per chart, with a short title that states what it shows.
- Use `--chart-primary` for the main series and `--chart-secondary` for comparison. On line charts,
  also distinguish series by line style, such as solid and dashed.
- Prefer lines for trends, and sorted horizontal bars for categories. Avoid pie charts, 3D effects and
  dual axes.
- Show at most five categories plus "Other", with direct labels where possible.
- Keep gridlines faint and few, and format axis values with `Intl`.
- Don't use a line chart for fewer than four data points; show the figures instead.
- Provide tooltips that also work with keyboard focus, and a data table or short text summary as an
  accessible alternative.

## Icons

Lucide React. Stroke-based icons only, and no emoji as icons. Sizes: `h-4 w-4` for inline and sidebar
navigation (in a `size-7` tile), and `h-5 w-5` for buttons. The Google logo is the only non-Lucide icon. Pair
icons with a text label unless the meaning is obvious, and give icon-only buttons an accessible name.

## Pre-Delivery Checklist

- [ ] Colors come from tokens, and pairs meet the contrast targets in both modes.
- [ ] Every interactive element has hover and visible focus states, and works by keyboard.
- [ ] Inputs have visible labels, and errors appear next to the field.
- [ ] Pointer targets are at least 24px, and touch targets on phones at least 44px.
- [ ] Layout works at 375, 768, 1024 and 1440px, with no horizontal page scroll.
- [ ] Reduced-motion is respected, and loading doesn't shift the layout.
