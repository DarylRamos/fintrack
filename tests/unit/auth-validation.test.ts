import { describe, expect, test } from "vitest";

import {
  emailSchema,
  forgotPasswordSchema,
  googleSignInSchema,
  newPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  cancelTwoFactorSetupSchema,
  confirmTwoFactorSetupSchema,
  twoFactorActionSchema,
  twoFactorCodeSchema,
} from "@/lib/validation/auth";

function firstError(result: { success: boolean; error?: { issues: { message: string }[] } }): string | undefined {
  return result.error?.issues[0]?.message;
}

describe("emailSchema", () => {
  test("trims and lowercases a valid email", () => {
    expect(emailSchema.parse("  Owner@Example.COM ")).toBe("owner@example.com");
  });

  test.each(["", "   ", "not-an-email", "owner@", "@example.com", "owner example@example.com"])(
    "rejects %j",
    (value) => {
      expect(emailSchema.safeParse(value).success).toBe(false);
    },
  );

  test("asks for an email when empty", () => {
    expect(firstError(emailSchema.safeParse(""))).toBe("Enter your email address.");
  });

  test("rejects an email longer than 254 characters", () => {
    const long = `${"a".repeat(64)}@${"b".repeat(186)}.com`; // 255 characters
    expect(long).toHaveLength(255);
    expect(emailSchema.safeParse(long).success).toBe(false);
  });
});

describe("newPasswordSchema", () => {
  test("accepts 8 characters with lowercase, uppercase and a digit", () => {
    expect(newPasswordSchema.safeParse("Abcdefg1").success).toBe(true);
  });

  test("accepts 72 characters", () => {
    expect(newPasswordSchema.safeParse(`Aa1${"x".repeat(69)}`).success).toBe(true);
  });

  test("rejects 7 characters", () => {
    expect(firstError(newPasswordSchema.safeParse("Abcdef1"))).toBe("Use at least 8 characters.");
  });

  test("rejects 73 characters", () => {
    expect(firstError(newPasswordSchema.safeParse(`Aa1${"x".repeat(70)}`))).toBe("Use at most 72 characters.");
  });

  test.each([
    ["no lowercase letter", "ABCDEFG1", "Include a lowercase letter."],
    ["no uppercase letter", "abcdefg1", "Include an uppercase letter."],
    ["no digit", "Abcdefgh", "Include a number."],
    ["letters and symbols but no digit", "Sunshine!!", "Include a number."],
  ])("rejects a password with %s", (_case, value, message) => {
    const result = newPasswordSchema.safeParse(value);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toContain(message);
  });

  test("lists every missing part, each with its own message", () => {
    const result = newPasswordSchema.safeParse("________");
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      "Include a lowercase letter.",
      "Include an uppercase letter.",
      "Include a number.",
    ]);
  });

  test("accepts symbols without requiring them", () => {
    expect(newPasswordSchema.safeParse("Sunshine1!").success).toBe(true);
    expect(newPasswordSchema.safeParse("Sunshine1").success).toBe(true);
  });

  test("counts only ASCII letters, as Supabase does", () => {
    expect(newPasswordSchema.safeParse("ÉÉÉÉÉÉé1").success).toBe(false);
  });
});

describe("signInSchema", () => {
  test("only requires a password to be entered, so older passwords still work", () => {
    expect(signInSchema.safeParse({ email: "owner@example.com", password: "short" }).success).toBe(true);
  });

  test("asks for a password when empty", () => {
    const result = signInSchema.safeParse({ email: "owner@example.com", password: "" });
    expect(firstError(result)).toBe("Enter your password.");
  });
});

describe("signUpSchema", () => {
  test("accepts matching passwords and normalises the email", () => {
    const result = signUpSchema.parse({
      email: " Owner@Example.com",
      password: "Sunshine1",
      confirmPassword: "Sunshine1",
    });
    expect(result.email).toBe("owner@example.com");
  });

  test("rejects a mismatched confirmation on the confirm field", () => {
    const result = signUpSchema.safeParse({
      email: "owner@example.com",
      password: "Sunshine1",
      confirmPassword: "Sunshine2",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: ["confirmPassword"], message: "Passwords don't match." });
  });
});

describe("forgotPasswordSchema and resetPasswordSchema", () => {
  test("forgot password needs a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: "owner@example.com" }).success).toBe(true);
  });

  test("reset password applies the new-password rule and the match", () => {
    expect(resetPasswordSchema.safeParse({ password: "weak", confirmPassword: "weak" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ password: "Sunshine1", confirmPassword: "Sunshine1" }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ password: "Sunshine1", confirmPassword: "Sunshine" }).success).toBe(false);
  });
});

describe("googleSignInSchema (unit 1.3)", () => {
  test("accepts a missing next and a string next", () => {
    expect(googleSignInSchema.parse({})).toEqual({ next: undefined });
    expect(googleSignInSchema.parse({ next: "/budgets" })).toEqual({ next: "/budgets" });
  });

  test.each([42, null, { path: "/budgets" }, ["/budgets"]])("drops a next of %j instead of failing", (next) => {
    expect(googleSignInSchema.parse({ next })).toEqual({ next: undefined });
  });
});

describe("twoFactorCodeSchema (unit 1.4)", () => {
  test.each([
    ["123456", "123456"],
    ["123 456", "123456"],
    [" 012345 ", "012345"],
  ])("accepts %j as %s", (value, expected) => {
    expect(twoFactorCodeSchema.parse(value)).toBe(expected);
  });

  test.each(["", "12345", "1234567", "12a456", "１２３４５６", "123-456"])("refuses %j", (value) => {
    const result = twoFactorCodeSchema.safeParse(value);
    expect(result.success).toBe(false);
    expect(firstError(result)).toBe("Enter the 6-digit code from your authenticator app.");
  });

  test("the action schema drops a non-string next", () => {
    expect(twoFactorActionSchema.parse({ code: "123456", next: 42 })).toEqual({ code: "123456", next: undefined });
  });

  test("setup actions need a UUID factor ID", () => {
    const factorId = "6f1c2a8e-3b4d-4c5e-8f9a-0b1c2d3e4f5a";
    expect(confirmTwoFactorSetupSchema.safeParse({ factorId, code: "123456" }).success).toBe(true);
    expect(confirmTwoFactorSetupSchema.safeParse({ factorId: "../x", code: "123456" }).success).toBe(false);
    expect(cancelTwoFactorSetupSchema.safeParse({ factorId }).success).toBe(true);
    expect(cancelTwoFactorSetupSchema.safeParse({}).success).toBe(false);
  });
});
