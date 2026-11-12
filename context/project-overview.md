# FinTrack

## Overview

FinTrack is a personal finance web app for tracking income, expenses, budgets,
financial goals, investments and debts in one secure place. It replaces
scattered spreadsheets and manual notes with clear summaries, charts and alerts,
so its user can understand their finances and act on them. It is a personal,
non-commercial project that runs on free service tiers. The interface is in
English only.

Source documents: `Functional Design.docx`, `High-level Requirements.docx` and
`User Story.docx`. Where they conflict, this file holds the resolved behavior.

## Goals

1. Record every income and expense, in any supported currency, with minimal
   clicks.
2. Show total income, expenses, savings and investments at a glance, converted
   to the user's preferred currency.
3. Warn the user in the app when a budget is nearing or over its limit, or when
   a significant transaction occurs.
4. Track progress toward savings goals, investment returns and debt payoff.
5. Keep financial data private to its owner and let the owner export or delete
   it.

## Core User Flow

1. The user signs up or logs in with email, Google or Facebook, and can enable
   two-factor authentication.
2. The user sets a preferred currency in their profile.
3. The user adds income and expenses, with categories, tags, notes and receipts,
   and schedules any recurring ones.
4. The dashboard shows the user's financial summary, charts, budget usage and
   goal progress.
5. The user creates budgets and receives in-app alerts as spending approaches or
   exceeds them.
6. The user sets goals with milestones, and tracks investments and debts.
7. The user generates filtered reports and exports them as CSV, Excel or PDF.

## Features

### Release 1: Core Features

**Authentication and profiles**

- Sign-up and log-in with email and password, Google or Facebook.
- Two-factor authentication with an authenticator app.
- Profile with personal settings, preferred currency and notification
  preferences.

**Dashboard**

- Summary of total income, expenses, savings and investments.
- Charts of spending habits and income trends.
- Quick view of budget usage and goal progress.

**Income and expense tracking**

- Add, edit and delete transactions with categories such as salary, rent and
  groceries.
- Notes and receipt or invoice attachments.
- Recurring income and expenses with automated scheduling.
- History filters by date, category and tag.

**Categorization and tags**

- Automatic categorization from user rules and matches with earlier merchants or
  notes.
- Custom tags on transactions.

**Budgets**

- Budgets per category, with real-time usage and visual indicators.
- In-app alerts when a budget is nearing or over its limit.
- In-app alerts for significant transactions, above an amount the user sets.

**Financial goals**

- Goals with target amounts and deadlines.
- Milestones and progress bars showing percent complete.

**Reports and analytics**

- Spending, income source and trend reports.
- Income versus expense comparison over time.
- Custom reports by date range, category or tag.
- Report export as CSV, Excel and PDF.

**Multi-currency**

- Transactions in any supported currency.
- Automatic conversion using daily exchange rates, with the rate date shown in
  the UI.
- Consolidated totals in the user's preferred currency.

**Investments**

- Manually maintained portfolio of stocks, bonds, cryptocurrencies and other
  investments.
- ROI, growth trends and summarized performance insights.

**Debts**

- Loans, credit card balances and other debts, with remaining balance, interest
  rate and due date.
- Avalanche and snowball payoff strategies and calculators.

**Security and privacy**

- Encryption in transit and at rest.
- Privacy settings, full data download and account deletion.
- Lightweight security checklist and dependency scanning.

### Release 2: Features to Add

**Data export and import**

- Export all financial data.
- Import from CSV files, with a preview and duplicate detection.

**Customizable settings**

- Personalized dashboard layout, categories and themes.
- Regional date, number and currency formats.

**Mobile**

- Mobile-friendly responsive web app, installable as a PWA.
- Push notifications for reminders and alerts.

**Help center**

- FAQs, tutorials and support resources.

**Parked until a country is chosen**

- Bank account linking, automatic transaction import and linked-account balance
  tracking.
- Tax reports summarizing income, expenses and deductible transactions, with data
  export for tax preparation.

## Scope

### In Scope

- A responsive Next.js web app covering the Release 1 and Release 2 features
  above, built in the phases listed in `progress-tracker.md`.
- Per-user data isolation, even though this is a personal project.
- Currencies offered by the exchange rate provider.

### Out of Scope

- Phone number sign-up, log-in and phone-based 2FA.
- Languages other than English.
- A native mobile app.
- True end-to-end encryption, because it would stop the server computing reports,
  alerts and auto-categorization.
- Exchange rates fresher than daily, and live investment price feeds (the latter
  is an open question).
- Machine-learning categorization.
- Tax filing service integration.
- A user community or forum.
- Formal third-party security audits.
- Paid services and paid plans.

## Success Criteria

1. A new user can sign up with email, Google or Facebook, enable 2FA and must
   complete it at every later sign-in, with any method.
2. A user can create, edit, filter and delete a transaction, attach a receipt, and
   open that receipt only through their own account.
3. A transaction in a foreign currency keeps its original amount, and totals
   appear in the preferred currency with the rate date shown.
4. Changing the preferred currency updates converted totals without altering any
   stored transaction.
5. A recurring rule posts exactly one transaction per due date, even if the daily
   job is retried.
6. Spending past a budget's alert level creates an in-app alert.
7. Goal, investment and debt screens show correct progress, ROI and payoff values,
   verified by unit tests.
8. A filtered report exports correctly as CSV, Excel and PDF.
9. Automated tests prove one user cannot read or change another user's data.
10. The app works at phone width with no horizontal page scroll.
