import { z } from "zod";

import { SUPPORTED_CURRENCIES } from "@/lib/money/currencies";

// Shared by the Profile form (browser) and updateProfile (server). Holds no secrets. See
// context/feature-specs/1.5-profile-and-preferred-currency.md, Server Action.

export const DISPLAY_NAME_MAX_LENGTH = 50;

// Trimmed; empty means "no name" (null). Control characters (such as a newline or tab) are refused.
// Letters with accents, other scripts and emoji are fine. Length counts characters, not UTF-16 units,
// to match Postgres's varchar(50). `null` is accepted as input too: the form sends the parsed value
// (an empty name is already null) and the action parses it again.
export const displayNameSchema = z
  .string()
  .nullable()
  .transform((value) => (value ?? "").trim())
  .refine((value) => [...value].length <= DISPLAY_NAME_MAX_LENGTH, {
    message: `Use at most ${DISPLAY_NAME_MAX_LENGTH} characters.`,
  })
  .refine((value) => !/\p{Cc}/u.test(value), { message: "Remove line breaks and tabs." })
  .transform((value) => (value === "" ? null : value));

export const preferredCurrencySchema = z.enum(SUPPORTED_CURRENCIES, {
  error: "Choose a currency from the list.",
});

export const profileSchema = z.object({
  displayName: displayNameSchema,
  preferredCurrency: preferredCurrencySchema,
});

export type ProfileInput = z.input<typeof profileSchema>;
export type ProfileValues = z.output<typeof profileSchema>;
