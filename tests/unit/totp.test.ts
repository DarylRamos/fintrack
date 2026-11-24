import { describe, expect, test } from "vitest";

import { base32Decode, codeSource, timeStep, totpAt } from "../e2e/totp";

// The browser test's TOTP helper (unit 1.4), checked against RFC 6238's SHA-1 test vectors. The
// RFC's key is the ASCII string "12345678901234567890", which is this base32 value.
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("totp helper", () => {
  test("decodes base32, ignoring spaces and case", () => {
    expect(base32Decode("gezd gnbv").toString("ascii")).toBe("12345");
    expect(base32Decode(RFC_SECRET).toString("ascii")).toBe("12345678901234567890");
  });

  test("refuses a key that isn't base32", () => {
    expect(() => base32Decode("not-base32!")).toThrow();
  });

  test.each([
    [59, "94287082"],
    [1111111109, "07081804"],
    [1234567890, "89005924"],
    [2000000000, "69279037"],
  ])("matches RFC 6238 at %i seconds", (seconds, expected) => {
    expect(totpAt(RFC_SECRET, timeStep(seconds * 1000), 8)).toBe(expected);
  });

  test("6-digit codes are the last six digits", () => {
    expect(totpAt(RFC_SECRET, timeStep(59_000))).toBe("287082");
  });

  test("the wrong code differs from the codes around now", () => {
    const source = codeSource(RFC_SECRET);
    const step = timeStep();
    const wrong = source.wrong();
    expect(wrong).toMatch(/^\d{6}$/);
    for (const s of [step - 1, step, step + 1]) {
      expect(wrong).not.toBe(totpAt(RFC_SECRET, s));
    }
  });
});
