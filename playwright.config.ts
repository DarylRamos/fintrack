import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);

// E2E_PORT lets a local run avoid a dev server already on port 3000.
const port = Number(process.env.E2E_PORT ?? 3000);
const baseURL = `http://localhost:${port}`;

// The development test account for the signed-in tests (unit 1.2a) and the 2FA flow (unit 1.4). Its
// 2FA stays off; the flow test turns it on and off again. Only these two values are read from
// .env.local, and never printed. CI doesn't have them, so the signed-in tests skip there.
for (const key of ["E2E_USER_EMAIL", "E2E_USER_PASSWORD"] as const) {
  if (!process.env[key] && existsSync(".env.local")) {
    const value = parseEnv(readFileSync(".env.local", "utf8"))[key];
    if (value) {
      process.env[key] = value;
    }
  }
}

// Runs against a production build (`npm run build` first), as the Next.js testing guide
// recommends. Chromium only, at desktop and phone width. A setup project signs in once with the
// development test account, when it is set, and saves the session for the signed-in tests. See
// context/feature-specs/0.5-vitest-playwright-ci.md and
// context/feature-specs/1.2a-route-protection-session-helpers.md.
export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "desktop",
      dependencies: ["setup"],
      testIgnore: /two-factor-flow\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "phone",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
      testIgnore: /two-factor-flow\.spec\.ts$/,
    },
    {
      // The full 2FA flow (unit 1.4), after every other test: turning 2FA on signs out the test
      // account's other sessions, including the one the signed-in tests share.
      name: "two-factor-flow",
      dependencies: ["desktop", "phone"],
      testMatch: /two-factor-flow\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `npm run start -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    // Not a real secret: it only exists inside the test server, so the heartbeat refusal tests
    // reach the "wrong secret" path rather than "not configured".
    // The Supabase values are placeholders for CI's build. Locally, `npm run build` inlines
    // .env.local's development values instead, so the auth tests accept either outcome.
    env: {
      CRON_SECRET: "e2e-throwaway-secret",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_placeholder",
    },
  },
});
