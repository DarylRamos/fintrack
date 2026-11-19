import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import ErrorPage from "@/app/error";
import GlobalError from "@/app/global-error";
import NotFound from "@/app/not-found";
import { errorDigest } from "@/components/status-page/status-page";

// The 404 and error pages' content (unit 1.2b). There is no browser test of the error page (the owner
// chose no on-demand error route), so these also prove an error's message never reaches the page.
// See context/feature-specs/1.2b-http-error-pages.md.

// next/font only works inside the Next.js build.
vi.mock("@/app/fonts", () => ({ fontVariables: "font-vars" }));

const SECRET_MESSAGE = "db password leaked in message 7f3a";

function serverError(digest?: string): Error {
  const error = new Error(SECRET_MESSAGE);
  error.stack = `Error: ${SECRET_MESSAGE}\n    at secretFrame (lib/db/secret.ts:1:1)`;
  return digest === undefined ? error : Object.assign(error, { digest });
}

const noop = () => {};

describe("404 page", () => {
  const html = renderToStaticMarkup(<NotFound />);

  test("shows the label, title and sentence", () => {
    expect(html).toContain("Error 404");
    expect(html).toContain("<h1");
    expect(html).toContain("Page not found");
    expect(html).toContain("The page you&#x27;re looking for doesn&#x27;t exist or may have moved.");
  });

  test("links home to /", () => {
    expect(html).toMatch(/<a [^>]*href="\/"[^>]*>Go to home<\/a>/);
  });

  test("shows no reference", () => {
    expect(html).not.toContain("Reference:");
  });
});

describe("error page", () => {
  test("shows the title, Try again and a home link", () => {
    const html = renderToStaticMarkup(<ErrorPage error={serverError("abc123")} retry={noop} />);
    expect(html).toContain("Something went wrong");
    expect(html).toContain("This page couldn&#x27;t load. Try again, or go back to home.");
    expect(html).toMatch(/<button [^>]*type="button"[^>]*>Try again<\/button>/);
    expect(html).toMatch(/<a [^>]*href="\/"[^>]*>Go to home<\/a>/);
    expect(html).toContain("<title>Something went wrong | FinTrack</title>");
  });

  test("shows the digest as the reference", () => {
    const html = renderToStaticMarkup(<ErrorPage error={serverError("abc123")} retry={noop} />);
    expect(html).toContain("Reference: abc123");
  });

  test.each([
    ["an Error with no digest", serverError()],
    ["an empty digest", serverError("  ")],
    ["a thrown string", "boom"],
    ["null", null],
    ["a non-string digest", { digest: 42 }],
  ])("shows no reference for %s", (_name, error) => {
    const html = renderToStaticMarkup(<ErrorPage error={error} retry={noop} />);
    expect(html).not.toContain("Reference:");
  });

  test("never shows the error's message or stack", () => {
    const html = renderToStaticMarkup(<ErrorPage error={serverError("abc123")} retry={noop} />);
    expect(html).not.toContain(SECRET_MESSAGE);
    expect(html).not.toContain("secretFrame");
  });
});

describe("global error page", () => {
  const html = renderToStaticMarkup(<GlobalError error={serverError("abc123")} retry={noop} />);

  test("renders its own document with the fonts", () => {
    expect(html).toMatch(/^<html lang="en" class="font-vars /);
    expect(html).toContain("<body");
    expect(html).toContain("<title>Something went wrong | FinTrack</title>");
  });

  test("shows the same content, with a full page link home", () => {
    expect(html).toContain("Something went wrong");
    expect(html).toContain(">Try again</button>");
    expect(html).toContain('<a href="/" class=');
    expect(html).toContain("Reference: abc123");
    expect(html).not.toContain(SECRET_MESSAGE);
    expect(html).not.toContain("secretFrame");
  });
});

describe("errorDigest", () => {
  test("returns only a non-empty string digest", () => {
    expect(errorDigest(serverError("d1"))).toBe("d1");
    expect(errorDigest({ digest: "" })).toBeNull();
    expect(errorDigest({ digest: 1 })).toBeNull();
    expect(errorDigest(new Error("x"))).toBeNull();
    expect(errorDigest(undefined)).toBeNull();
  });
});
