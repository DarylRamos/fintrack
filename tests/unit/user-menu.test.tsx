import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

// The sign-out action is a Server Action; only its import is needed here.
vi.mock("@/app/(auth)/actions", () => ({ signOut: vi.fn() }));

import { avatarInitial, UserMenu } from "@/components/app-shell/user-menu";

// The account menu's avatar letter (unit 1.5). The menu's contents render in a portal only when it
// opens, so the render test covers the trigger; the open menu is checked in Playwright
// (tests/e2e/profile.spec.ts). See context/feature-specs/1.5-profile-and-preferred-currency.md.

describe("avatarInitial", () => {
  test("uses the display name's first letter", () => {
    expect(avatarInitial("owner@example.com", "ada")).toBe("A");
  });

  test("falls back to the email without a name, or with a blank one", () => {
    expect(avatarInitial("owner@example.com", null)).toBe("O");
    expect(avatarInitial("owner@example.com", "   ")).toBe("O");
  });

  test("keeps a whole character for names outside the BMP", () => {
    expect(avatarInitial("owner@example.com", "😀 Smile")).toBe("😀");
  });

  test("upper-cases accented letters", () => {
    expect(avatarInitial("owner@example.com", "élodie")).toBe("É");
  });
});

describe("UserMenu", () => {
  test("shows the name's letter on the avatar", () => {
    const html = renderToStaticMarkup(<UserMenu email="owner@example.com" displayName="Ada" />);
    expect(html).toContain('aria-label="Account menu"');
    expect(html).toMatch(/aria-hidden="true">A<\/span>/);
  });

  test("shows the email's letter without a name", () => {
    const html = renderToStaticMarkup(<UserMenu email="owner@example.com" />);
    expect(html).toMatch(/aria-hidden="true">O<\/span>/);
  });
});
