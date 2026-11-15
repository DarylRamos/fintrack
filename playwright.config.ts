import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);

// Runs against a production build (`npm run build` first), as the Next.js testing guide
// recommends. Chromium only, at desktop and phone width. See
// context/feature-specs/0.5-vitest-playwright-ci.md.
export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "phone",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !isCI,
    timeout: 120_000,
    // Not a real secret: it only exists inside the test server, so the heartbeat refusal tests
    // reach the "wrong secret" path rather than "not configured".
    env: { CRON_SECRET: "e2e-throwaway-secret" },
  },
});
