import { describe, expect, test } from "vitest";

import { profileSchema } from "@/lib/validation/profile";

// The Profile form's rules, shared by the browser and updateProfile (unit 1.5). See
// context/feature-specs/1.5-profile-and-preferred-currency.md, Server Action.

function parse(displayName: string, preferredCurrency: string = "SGD") {
  return profileSchema.safeParse({ displayName, preferredCurrency });
}

describe("display name", () => {
  test("is trimmed", () => {
    expect(parse("  Ada Lovelace  ")).toMatchObject({ success: true, data: { displayName: "Ada Lovelace" } });
  });

  test.each(["", "   "])("empty (%j) means no name", (value) => {
    expect(parse(value)).toMatchObject({ success: true, data: { displayName: null } });
  });

  test("null also means no name (the form sends its parsed value, and the action parses it again)", () => {
    const once = profileSchema.parse({ displayName: "", preferredCurrency: "SGD" });
    expect(profileSchema.safeParse(once)).toMatchObject({ success: true, data: { displayName: null } });
  });

  test("parsing twice gives the same result", () => {
    const once = profileSchema.parse({ displayName: "  Ada  ", preferredCurrency: "SGD" });
    expect(profileSchema.parse(once)).toEqual(once);
  });

  test("accepts 50 characters and refuses 51", () => {
    expect(parse("a".repeat(50)).success).toBe(true);
    const result = parse("a".repeat(51));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Use at most 50 characters.");
  });

  test("counts characters, not UTF-16 units (matching varchar(50))", () => {
    expect(parse("😀".repeat(50)).success).toBe(true);
    expect(parse("😀".repeat(51)).success).toBe(false);
  });

  test.each(["José Ñúñez", "李小龙", "Zoë 🌱"])("accepts %j", (value) => {
    expect(parse(value).success).toBe(true);
  });

  test.each(["Ada\nLovelace", "Ada\tLovelace", "Ada\u0000"])("refuses control characters in %j", (value) => {
    const result = parse(value);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Remove line breaks and tabs.");
  });

  test("refuses a missing or non-string value", () => {
    expect(profileSchema.safeParse({ preferredCurrency: "SGD" }).success).toBe(false);
    expect(profileSchema.safeParse({ displayName: 42, preferredCurrency: "SGD" }).success).toBe(false);
  });
});

describe("preferred currency", () => {
  test("accepts a listed code", () => {
    expect(parse("", "EUR")).toMatchObject({ success: true, data: { preferredCurrency: "EUR" } });
  });

  test.each(["usd", "BGN", "XXX", ""])("refuses %j", (code) => {
    const result = parse("", code);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Choose a currency from the list.");
  });
});
