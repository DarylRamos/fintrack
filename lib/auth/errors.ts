import { isAuthError } from "@supabase/supabase-js";

// Maps Supabase Auth errors to FinTrack's error codes and messages. No message says whether an
// email address has an account.

export type AuthErrorCode =
  | "INVALID_INPUT"
  | "INVALID_CREDENTIALS"
  | "EMAIL_NOT_CONFIRMED"
  | "EMAIL_NOT_AUTHORIZED"
  | "WEAK_PASSWORD"
  | "SAME_PASSWORD"
  | "RATE_LIMITED"
  | "NOT_SIGNED_IN"
  | "GOOGLE_FAILED"
  | "AUTH_FAILED";

export interface AuthActionError {
  code: AuthErrorCode;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export interface AuthActionResult {
  error: AuthActionError;
}

const MESSAGES: Record<AuthErrorCode, string> = {
  INVALID_INPUT: "Check the highlighted fields.",
  INVALID_CREDENTIALS: "Email or password is incorrect.",
  EMAIL_NOT_CONFIRMED: "Confirm your email first. Check your inbox for the link.",
  EMAIL_NOT_AUTHORIZED: "We can't send email to that address. Use a different one.",
  WEAK_PASSWORD:
    "That password is too weak. Use at least 8 characters, with an uppercase letter, a lowercase letter and a number.",
  SAME_PASSWORD: "Choose a password you haven't used here before.",
  RATE_LIMITED: "Too many attempts. Try again in a few minutes.",
  NOT_SIGNED_IN: "This link has expired or was already used. Request a new one.",
  // Every Google sign-in that comes back without a session (cancelled, refused, or failed). It never
  // names a reason, so it never reveals an account (unit 1.3).
  GOOGLE_FAILED: "Google sign-in didn't finish. Try again, or use your email and password.",
  AUTH_FAILED: "Something went wrong. Try again.",
};

const SUPABASE_CODES: Record<string, AuthErrorCode> = {
  invalid_credentials: "INVALID_CREDENTIALS",
  email_not_confirmed: "EMAIL_NOT_CONFIRMED",
  email_address_not_authorized: "EMAIL_NOT_AUTHORIZED",
  weak_password: "WEAK_PASSWORD",
  same_password: "SAME_PASSWORD",
  over_request_rate_limit: "RATE_LIMITED",
  over_email_send_rate_limit: "RATE_LIMITED",
};

export function authError(code: AuthErrorCode, fieldErrors?: AuthActionError["fieldErrors"]): AuthActionResult {
  return { error: fieldErrors ? { code, message: MESSAGES[code], fieldErrors } : { code, message: MESSAGES[code] } };
}

export function mapAuthError(error: unknown): AuthErrorCode {
  if (isAuthError(error)) {
    if (error.code && error.code in SUPABASE_CODES) {
      return SUPABASE_CODES[error.code];
    }
    if (error.status === 429) {
      return "RATE_LIMITED";
    }
  }
  return "AUTH_FAILED";
}

// Logs only the error's name and Supabase code: never its message, which can include the email.
export function logAuthError(action: string, error: unknown): void {
  const name = error instanceof Error ? error.name : "UnknownError";
  const code = isAuthError(error) ? (error.code ?? "none") : "none";
  console.error(`[auth] ${action} failed: ${name} (${code})`);
}

// An OAuth `error` parameter (such as `access_denied`) is kept only when it looks like an error code,
// so nothing a user or provider wrote ever reaches the logs. `error_description` is never read.
const PROVIDER_ERROR_CODE = /^[a-z_]{1,64}$/;

export function safeProviderErrorCode(value: string | null | undefined): string {
  return value && PROVIDER_ERROR_CODE.test(value) ? value : "unknown";
}

// Logs an OAuth `error` parameter returned to the callback, as its safe code only.
export function logProviderError(action: string, value: string | null | undefined): void {
  console.error(`[auth] ${action} failed: ProviderError (${safeProviderErrorCode(value)})`);
}
