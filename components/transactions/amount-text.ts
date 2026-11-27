import { isSupportedCurrency } from "@/lib/money/currencies";
import { formatMoney } from "@/lib/money/format";
import type { TransactionType } from "@/lib/validation/transaction";

// A transaction's amount as the list shows it: an expense with a minus sign ("-SGD 45.00"), an income
// with a plus sign ("+SGD 2,500.00"), so the sign carries the meaning, not colour (ui-context.md).
// A code no longer in the list (only if the list shrinks) prints as the code and the stored digits.
export function signedAmount({ type, amount, currency }: { type: TransactionType; amount: string; currency: string }): string {
  if (!isSupportedCurrency(currency)) {
    return `${type === "expense" ? "-" : "+"}${currency} ${amount}`;
  }
  return type === "expense" ? formatMoney(`-${amount}`, currency) : `+${formatMoney(amount, currency)}`;
}

export const TYPE_LABELS: Record<TransactionType, string> = { expense: "Expense", income: "Income" };
