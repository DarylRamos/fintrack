import { expect, test, type Page, type Request } from "@playwright/test";

// Google sign-in (unit 1.3), signed out, at both widths; runs in CI. The real Google flow is checked
// by hand. Pressing the button is stopped at Supabase's authorize URL: the request is aborted, so
// nothing leaves the machine. Locally the build may use the development project's URL, and in CI a
// placeholder; the pattern matches both. See context/feature-specs/1.3-google-sign-in.md.

const AUTHORIZE = "**/auth/v1/authorize**";
const GOOGLE_MESSAGE = "Google sign-in didn't finish. Try again, or use your email and password.";

// Inside the page's main column, so Next.js's own route announcer (also an alert) doesn't match.
function formAlert(page: Page) {
  return page.locator("main").getByRole("alert");
}

function googleButton(page: Page) {
  return page.getByRole("button", { name: "Continue with Google" });
}

async function pressGoogle(page: Page): Promise<URL> {
  let resolveRequest: (request: Request) => void = () => {};
  const authorize = new Promise<Request>((resolve) => {
    resolveRequest = resolve;
  });
  await page.route(AUTHORIZE, async (route) => {
    resolveRequest(route.request());
    await route.abort();
  });
  await googleButton(page).click();
  return new URL((await authorize).url());
}

for (const path of ["/sign-in", "/sign-up"]) {
  test(`${path} shows the divider and the round Google button, with no horizontal scroll`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByText("or continue with", { exact: true })).toBeVisible();
    const button = googleButton(page);
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    const box = await button.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    // Round and icon-only: as wide as it is tall, with the name carried by aria-label.
    expect(Math.abs((box?.width ?? 0) - (box?.height ?? 0))).toBeLessThanOrEqual(1);
    await expect(button).toHaveText("");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("the Google button comes right after the email form's button by keyboard", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Sign in", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(googleButton(page)).toBeFocused();
});

test("from /sign-in?next, it goes to Supabase's authorize URL with the return path", async ({ page, baseURL }) => {
  await page.goto(`/sign-in?next=${encodeURIComponent("/budgets")}`);
  const url = await pressGoogle(page);
  expect(url.searchParams.get("provider")).toBe("google");
  expect(url.searchParams.get("code_challenge_method")).toBe("s256");
  expect(url.searchParams.get("code_challenge")).toBeTruthy();
  expect(url.searchParams.get("redirect_to")).toBe(`${baseURL}/auth/callback?next=%2Fbudgets`);
});

test("from /sign-up, it returns to the dashboard", async ({ page, baseURL }) => {
  await page.goto("/sign-up");
  const url = await pressGoogle(page);
  expect(url.searchParams.get("provider")).toBe("google");
  expect(url.searchParams.get("redirect_to")).toBe(`${baseURL}/auth/callback?next=%2Fdashboard`);
});

for (const query of ["?error=access_denied&error_description=The+user+denied+access", ""]) {
  test(`/auth/callback${query ? " with an error" : " with no code"} shows the message on sign-in, once`, async ({
    page,
  }) => {
    await page.goto(`/auth/callback${query}`);
    await expect(page).toHaveURL("/sign-in");
    const alert = formAlert(page);
    await expect(alert).toHaveText(GOOGLE_MESSAGE);
    await expect(alert).toBeFocused();

    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome back!");
    await expect(formAlert(page)).toHaveCount(0);
  });
}

test("another error value on /sign-in is ignored", async ({ page }) => {
  await page.goto("/sign-in?error=something-else");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome back!");
  await expect(formAlert(page)).toHaveCount(0);
});
