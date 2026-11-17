import { expect, test, type Locator, type Page } from "@playwright/test";

// The auth pages, their validation and redirects, against the production build. CI's build uses
// placeholder Supabase values that nothing listens on, so no real project is reached there. The
// real sign-up flow (email, link, session) is checked by hand; see
// context/feature-specs/1.1a-email-sign-up-sign-in-password-reset.md, step 10.

function heading(page: Page) {
  return page.getByRole("heading", { level: 1 });
}

async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

const pages = [
  { path: "/sign-in", title: "Sign in", fields: ["Email", "Password"] },
  { path: "/sign-up", title: "Create your account", fields: ["Email", "Password", "Confirm password"] },
  { path: "/forgot-password", title: "Reset your password", fields: ["Email"] },
];

for (const { path, title, fields } of pages) {
  test(`${path} renders with visible labels and no horizontal scroll`, async ({ page, isMobile }) => {
    await page.goto(path);
    await expect(heading(page)).toHaveText(title);
    for (const label of fields) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    }
    // The brand panel shows beside the form on wider screens and is hidden on phones.
    const welcome = page.getByText("Welcome to FinTrack!");
    if (isMobile) {
      await expect(welcome).toBeHidden();
    } else {
      await expect(welcome).toBeVisible();
    }
    await expectNoHorizontalScroll(page);
  });
}

test("sign-in shows field errors for empty fields and focuses the first one", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Enter your email address.")).toBeVisible();
  await expect(page.getByText("Enter your password.")).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page).toHaveURL("/sign-in");
});

test("sign-up checks the password rule and the confirmation", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Email", { exact: true }).fill("owner@example.com");
  await page.getByLabel("Password", { exact: true }).fill("sunshine");
  await page.getByLabel("Confirm password", { exact: true }).fill("different");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Include an uppercase letter.")).toBeVisible();
  await expect(page.getByText("Passwords don't match.")).toBeVisible();
  await expect(page).toHaveURL("/sign-up");
});

test("forgot password rejects an invalid email", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByLabel("Email", { exact: true }).fill("not-an-email");
  await page.getByRole("button", { name: "Send reset link" }).click();

  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page).toHaveURL("/forgot-password");
});

test("the show password button reveals and hides the password", async ({ page }) => {
  await page.goto("/sign-in");
  const password = page.getByLabel("Password", { exact: true });
  await password.fill("Sunshine1");
  await expect(password).toHaveAttribute("type", "password");

  await page.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(password).toHaveAttribute("type", "password");
});

// A person's click: press, let the page react to the blur, then release. Playwright's own click
// presses and releases too quickly for a blur-triggered layout shift to move the target.
async function humanClick(page: Page, target: Locator) {
  const box = await target.boundingBox();
  if (!box) {
    throw new Error("The target isn't visible");
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  await page.mouse.up();
}

test("leaving an empty field shows no error, so a link next to it works on the first click", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Password", { exact: true }).focus();
  await humanClick(page, page.getByRole("link", { name: "Forgot password?" }));
  await expect(page).toHaveURL("/forgot-password");

  await page.goto("/sign-up");
  await page.getByLabel("Email", { exact: true }).focus();
  await humanClick(page, page.getByRole("link", { name: "Sign in" }));
  await expect(page).toHaveURL("/sign-in");
});

test("after a failed submit, field errors update as you type", async ({ page }) => {
  await page.goto("/forgot-password");
  const email = page.getByLabel("Email", { exact: true });
  await email.fill("not-an-email");
  await email.blur();
  await expect(page.getByText("Enter a valid email address.")).toBeHidden();

  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await email.fill("owner@example.com");
  await expect(page.getByText("Enter a valid email address.")).toBeHidden();
});

test("links move between sign in, sign up and forgot password", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("link", { name: "Sign up" }).click();
  await expect(page).toHaveURL("/sign-up");

  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/sign-in");

  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page).toHaveURL("/forgot-password");

  await page.getByRole("link", { name: "Back to sign in" }).click();
  await expect(page).toHaveURL("/sign-in");
});

test("a valid sign-in that Supabase refuses or can't be reached shows a form error, not a crash", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email", { exact: true }).fill("e2e-nobody@example.com");
  await page.getByLabel("Password", { exact: true }).fill("Not-a-real-password-1");
  await page.getByRole("button", { name: "Sign in" }).click();

  // CI: the placeholder Supabase is unreachable ("Something went wrong"). Locally, the build may
  // use the development project, which refuses the unknown account.
  await expect(page.getByRole("alert").filter({ hasText: /Something went wrong|Email or password is incorrect/ })).toBeVisible();
  await expect(page).toHaveURL("/sign-in");
});

test("the check-email page never shows an address", async ({ page }) => {
  await page.goto("/check-email?reason=reset");
  await expect(heading(page)).toHaveText("Check your email");
  await expect(page.getByText("If an account exists for that email")).toBeVisible();
  await expect(page.getByText("Open the link in this browser.")).toBeVisible();

  // True whether or not the email already had an account, and reveals neither.
  await page.goto("/check-email?reason=sign-up");
  await expect(page.getByText("If you already have an account, sign in instead.")).toBeVisible();
  await expect(page.getByText("We sent")).toHaveCount(0);
});

test("/auth/confirm without a token goes to the auth error page", async ({ page }) => {
  await page.goto("/auth/confirm");
  await expect(page).toHaveURL("/auth-error");
  await expect(heading(page)).toHaveText("That link didn't work");
  await expect(page.getByText("Confirming your email?")).toBeVisible();
  await expect(page.getByText("Resetting your password?")).toBeVisible();
});

test("Supabase's error redirect for an expired link goes to the auth error page", async ({ page }) => {
  await page.goto("/auth/confirm?next=%2Fdashboard&error=access_denied&error_code=otp_expired");
  await expect(page).toHaveURL("/auth-error");
});

// Supabase puts a used link's error in the URL fragment, which the browser keeps through
// /auth/confirm's redirect. The auth pages remove it (unit 1.1b, Hand-Check Fix).
const supabaseErrorHash =
  "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired&sb=";

test("Supabase's error fragment carried through /auth/confirm is removed from the URL", async ({ page }) => {
  await page.goto(`/auth/confirm?next=%2Freset-password${supabaseErrorHash}`);
  await expect(heading(page)).toHaveText("That link didn't work");
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("");
  expect(new URL(page.url()).pathname).toBe("/auth-error");
});

for (const path of ["/reset-password", "/auth-error"]) {
  test(`${path} removes Supabase's error fragment from the URL`, async ({ page }) => {
    await page.goto(`${path}${supabaseErrorHash}`);
    await expect(heading(page)).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("");
    expect(new URL(page.url()).pathname).toBe(path);
  });
}

test("the auth pages leave other URL fragments alone", async ({ page }) => {
  await page.goto("/sign-in#notes");
  await expect(heading(page)).toHaveText("Sign in");
  // Give the page's effects time to run before checking nothing changed.
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => window.location.hash)).toBe("#notes");
});

test("/reset-password without a session says the link expired", async ({ page }) => {
  await page.goto("/reset-password");
  await expect(heading(page)).toHaveText("Link expired");
  await expect(page.getByRole("link", { name: "Request a new link" })).toBeVisible();
});

test("the page header offers Sign in when signed out", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(heading(page)).toHaveText("Dashboard");
  const signIn = page.locator("#main").getByRole("link", { name: "Sign in" });
  await expect(signIn).toBeVisible();

  // The layout places the account area beside the header; the header leaves room, so the title
  // and breadcrumb never run under it.
  const header = page.locator("#main header");
  const [headerBox, linkBox] = await Promise.all([header.boundingBox(), signIn.boundingBox()]);
  const contentRight = await header.evaluate((el) => {
    const { right } = el.getBoundingClientRect();
    return right - parseFloat(getComputedStyle(el).paddingRight);
  });
  expect(headerBox && linkBox).toBeTruthy();
  expect(contentRight).toBeLessThanOrEqual(linkBox!.x);
  expect(linkBox!.y).toBeLessThan(headerBox!.y + headerBox!.height);

  await signIn.click();
  await expect(page).toHaveURL("/sign-in");
});
