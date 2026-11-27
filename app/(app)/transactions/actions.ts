"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { type ActionError, failure, type FieldErrors, logActionError } from "@/lib/actions/result";
import { getSignedInUser } from "@/lib/auth/session";
import * as transactions from "@/lib/db/transactions";
import { CATEGORY_MESSAGE, transactionIdSchema, transactionSchema } from "@/lib/validation/transaction";

// Adding, changing and deleting a transaction (unit 2.2). Each is a public endpoint: a session that
// finished 2FA first (invariant 6), then Zod, then the data layer with the session's user ID (never one
// from input). Success redirects to the list with a short-lived `done` value for its status line
// (Question F); `redirect` runs outside every `try`, as Next.js requires. Never logs amounts,
// currencies, descriptions, dates, category or tag names, or IDs. Unit 2.3 adds the category and tags: a
// category that isn't one of the user's of this type is a field error, not NOT_FOUND (which stays for the
// transaction itself). See context/feature-specs/2.2-transaction-create-edit-delete.md and
// 2.3-categories-and-tags.md.

export type TransactionErrorCode = "NOT_SIGNED_IN" | "INVALID_INPUT" | "NOT_FOUND" | "SAVE_FAILED" | "DELETE_FAILED";

const MESSAGES: Record<TransactionErrorCode, string> = {
  NOT_SIGNED_IN: "Your session has ended. Sign in again.",
  INVALID_INPUT: "Check the highlighted fields.",
  NOT_FOUND: "This transaction no longer exists.",
  SAVE_FAILED: "Couldn't save this transaction. Try again.",
  DELETE_FAILED: "Couldn't delete this transaction. Try again.",
};

// On success the action redirects, so it only ever returns an error.
export type TransactionActionResult = ActionError<TransactionErrorCode>;

function transactionFailure(code: TransactionErrorCode, fieldErrors?: FieldErrors): TransactionActionResult {
  return failure(code, MESSAGES[code], fieldErrors);
}

function categoryRefused(): TransactionActionResult {
  return transactionFailure("INVALID_INPUT", { categoryId: [CATEGORY_MESSAGE] });
}

export async function createTransaction(input: unknown): Promise<TransactionActionResult> {
  const user = await getSignedInUser();
  if (!user) {
    return transactionFailure("NOT_SIGNED_IN");
  }
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) {
    return transactionFailure("INVALID_INPUT", z.flattenError(parsed.error).fieldErrors);
  }

  let created: Awaited<ReturnType<typeof transactions.createTransaction>>;
  try {
    created = await transactions.createTransaction(user.userId, parsed.data);
  } catch (error) {
    logActionError("transactions", "createTransaction", error);
    return transactionFailure("SAVE_FAILED");
  }
  if ("error" in created) {
    return categoryRefused();
  }
  redirect("/transactions?done=added");
}

export async function updateTransaction(id: unknown, input: unknown): Promise<TransactionActionResult> {
  const user = await getSignedInUser();
  if (!user) {
    return transactionFailure("NOT_SIGNED_IN");
  }
  const parsedId = transactionIdSchema.safeParse(id);
  if (!parsedId.success) {
    return transactionFailure("NOT_FOUND");
  }
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) {
    return transactionFailure("INVALID_INPUT", z.flattenError(parsed.error).fieldErrors);
  }

  let updated: Awaited<ReturnType<typeof transactions.updateTransaction>>;
  try {
    updated = await transactions.updateTransaction(user.userId, parsedId.data, parsed.data);
  } catch (error) {
    logActionError("transactions", "updateTransaction", error);
    return transactionFailure("SAVE_FAILED");
  }
  if (!updated) {
    return transactionFailure("NOT_FOUND");
  }
  if ("error" in updated) {
    return categoryRefused();
  }
  redirect("/transactions?done=updated");
}

export async function deleteTransaction(id: unknown): Promise<TransactionActionResult> {
  const user = await getSignedInUser();
  if (!user) {
    return transactionFailure("NOT_SIGNED_IN");
  }
  const parsedId = transactionIdSchema.safeParse(id);
  if (!parsedId.success) {
    return transactionFailure("NOT_FOUND");
  }

  let deleted: boolean;
  try {
    deleted = await transactions.deleteTransaction(user.userId, parsedId.data);
  } catch (error) {
    logActionError("transactions", "deleteTransaction", error);
    return transactionFailure("DELETE_FAILED");
  }
  if (!deleted) {
    return transactionFailure("NOT_FOUND");
  }
  redirect("/transactions?done=deleted");
}
