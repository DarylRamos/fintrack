import { z } from "zod";

import { parseAmountInput } from "@/lib/money/amount";
import { amountMessage, currencySchema, moneyShape, withCanonicalAmount } from "@/lib/validation/money";

// A transaction's fields, shared by the transaction form (browser) and the transaction actions
// (server). Holds no secrets. See context/feature-specs/2.2-transaction-create-edit-delete.md,
// Validation.

export const TRANSACTION_TYPES = ["expense", "income"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const DESCRIPTION_MAX_LENGTH = 100;

// The earliest date accepted, and how far ahead a date may be (Question C): the limits only catch typos.
export const EARLIEST_TRANSACTION_DATE = "2000-01-01";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isoDate(year: number, monthIndex: number, day: number): string {
  // Date.UTC rolls an impossible day over (29 Feb in a common year becomes 1 Mar).
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

// Today's calendar date on this machine's clock, as YYYY-MM-DD: the browser's own day in the form
// (Question B), and the server's (UTC on Vercel) in the actions. The one-year limit is generous enough
// for the difference.
export function todayIsoDate(now: Date = new Date()): string {
  return isoDate(now.getFullYear(), now.getMonth(), now.getDate());
}

// The latest date accepted: one year after `today`.
export function latestTransactionDate(today: string = todayIsoDate()): string {
  const [year, month, day] = today.split("-").map(Number);
  return isoDate(year + 1, month - 1, day);
}

// A real calendar date in YYYY-MM-DD form (2026-02-30 is refused).
export function isCalendarDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    return false;
  }
  const [, year, month, day] = match.map(Number);
  return month >= 1 && month <= 12 && isoDate(year, month - 1, day) === value;
}

export const transactionTypeSchema = z.enum(TRANSACTION_TYPES, { error: "Choose income or expense." });

// One message per problem. No check uses `abort` (an aborted field would stop the object-level amount
// check below), so the range checks pass over a value that isn't a date.
export const occurredOnSchema = z
  .string({ error: "Enter a date." })
  .trim()
  .refine(isCalendarDate, { message: "Enter a date." })
  .refine((value) => !isCalendarDate(value) || value >= EARLIEST_TRANSACTION_DATE, {
    message: "Enter a date from 1 Jan 2000.",
  })
  .refine((value) => !isCalendarDate(value) || value <= latestTransactionDate(), {
    message: "Enter a date no more than a year ahead.",
  });

// Trimmed; 1 to 100 characters (counted as characters, like Postgres's varchar), with no control
// characters such as a line break or tab.
export const descriptionSchema = z
  .string({ error: "Enter a description." })
  .trim()
  .refine((value) => value !== "", { message: "Enter a description." })
  .refine((value) => [...value].length <= DESCRIPTION_MAX_LENGTH, {
    message: `Use at most ${DESCRIPTION_MAX_LENGTH} characters.`,
  })
  .refine((value) => !/\p{Cc}/u.test(value), { message: "Remove line breaks and tabs." });

// The amount is checked whenever the currency is valid, even while other fields fail (Zod's `when`), so
// one submit shows every problem; unit 2.1's moneySchema checks it only once the rest passed. The
// final transform swaps in the canonical string ("1,234.5" becomes "1234.50"). Unknown keys (an `id`
// or `userId`) are dropped. Parsing the output again gives the same result.
export const transactionSchema = z
  .object({
    type: transactionTypeSchema,
    ...moneyShape,
    occurredOn: occurredOnSchema,
    description: descriptionSchema,
  })
  .superRefine(
    (value, ctx) => {
      const parsed = parseAmountInput(value.amount, value.currency);
      if (!parsed.ok) {
        ctx.addIssue({ code: "custom", path: ["amount"], message: amountMessage(parsed.reason, value.currency) });
      }
    },
    {
      when: ({ value }) => {
        const fields = value as { amount?: unknown; currency?: unknown } | null;
        return typeof fields?.amount === "string" && currencySchema.safeParse(fields.currency).success;
      },
    },
  )
  .transform(withCanonicalAmount);

export type TransactionInput = z.input<typeof transactionSchema>;
export type TransactionValues = z.output<typeof transactionSchema>;

// A transaction's ID, checked before any query, so a malformed one never reaches Postgres.
export const transactionIdSchema = z.uuid();
