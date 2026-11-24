import { z } from "zod";

// Shared by the auth forms (client) and the auth Server Actions (server), so both check the same
// rules. Holds no secrets. See context/feature-specs/1.1a-email-sign-up-sign-in-password-reset.md.

// The same rule is set in both Supabase projects (minimum 8, "Lowercase, uppercase letters and
// digits"), so a caller that bypasses the app can't set a weaker password. The character sets are
// ASCII, as Supabase checks them. 72 is the bcrypt limit Supabase uses.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const PASSWORD_HINT =
  "At least 8 characters, with an uppercase letter, a lowercase letter and a number.";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email address.")
  .max(254, "Email addresses can't be longer than 254 characters.")
  .pipe(z.email("Enter a valid email address."));

export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters.`)
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include a number.");

// Sign-in only checks that a password was entered, so a rule change never locks out an older
// password.
const currentPasswordSchema = z.string().min(1, "Enter your password.").max(PASSWORD_MAX_LENGTH);

const confirmPasswordSchema = z.string().min(1, "Confirm your password.");

export const signInSchema = z.object({
  email: emailSchema,
  password: currentPasswordSchema,
});

// The sign-in action's input: the form's fields plus where to return afterwards. Only the shape is
// checked here, and a bad value is dropped rather than blocking sign-in; safeReturnPath decides the
// target (unit 1.2a).
export const signInActionSchema = signInSchema.extend({
  next: z.string().optional().catch(undefined),
});

// The Google sign-in action's input: only where to return afterwards, checked like sign-in's. See
// context/feature-specs/1.3-google-sign-in.md.
export const googleSignInSchema = z.object({
  next: z.string().optional().catch(undefined),
});

// A 6-digit code from an authenticator app (unit 1.4). Spaces are removed first, since some apps
// show the code as "123 456". See context/feature-specs/1.4-authenticator-app-2fa.md, Errors.
export const TWO_FACTOR_CODE_MESSAGE = "Enter the 6-digit code from your authenticator app.";

export const twoFactorCodeSchema = z
  .string()
  .transform((value) => value.replace(/\s+/g, ""))
  .pipe(z.string().regex(/^\d{6}$/, TWO_FACTOR_CODE_MESSAGE));

// The 2FA step's form, and the action's input (the form plus where to go afterwards).
export const twoFactorSchema = z.object({
  code: twoFactorCodeSchema,
});

export const twoFactorActionSchema = twoFactorSchema.extend({
  next: z.string().optional().catch(undefined),
});

// Settings: confirming or cancelling a setup names the new factor; turning 2FA off needs only a code.
const factorIdSchema = z.uuid();

export const confirmTwoFactorSetupSchema = z.object({
  factorId: factorIdSchema,
  code: twoFactorCodeSchema,
});

export const cancelTwoFactorSetupSchema = z.object({
  factorId: factorIdSchema,
});

export const disableTwoFactorSchema = twoFactorSchema;

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: newPasswordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: newPasswordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export type SignInInput = z.input<typeof signInSchema>;
export type SignUpInput = z.input<typeof signUpSchema>;
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;
export type TwoFactorInput = z.input<typeof twoFactorSchema>;
