import "server-only";

import { DEFAULT_CURRENCY, isSupportedCurrency, type CurrencyCode } from "@/lib/money/currencies";

import { db } from "./client";

// The only code that touches the `profiles` table (unit 1.5). The key is the Supabase auth user's ID,
// so `id` is the owner column: every query filters on it, and `userId` always comes from the verified
// session, never from input (invariant 3). Not cached (invariant 9). See
// context/feature-specs/1.5-profile-and-preferred-currency.md, Data Layer.

export interface ProfileView {
  displayName: string | null;
  preferredCurrency: CurrencyCode;
}

function toView(row: { displayName: string | null; preferredCurrency: string } | null): ProfileView {
  // A code no longer in the list (only if the list shrinks) reads as the default, so the form never
  // shows a value it can't save.
  const currency = row?.preferredCurrency;
  return {
    displayName: row?.displayName ?? null,
    preferredCurrency: currency && isSupportedCurrency(currency) ? currency : DEFAULT_CURRENCY,
  };
}

const viewFields = { displayName: true, preferredCurrency: true } as const;

// The user's profile, or the defaults when they never saved one. Reading never creates a row.
export async function getProfile(userId: string): Promise<ProfileView> {
  const row = await db.profile.findUnique({ where: { id: userId }, select: viewFields });
  return toView(row);
}

// Creates the row on the first save, updates it afterwards. Returns what was saved.
export async function saveProfile(userId: string, input: ProfileView): Promise<ProfileView> {
  const data = { displayName: input.displayName, preferredCurrency: input.preferredCurrency };
  const row = await db.profile.upsert({
    where: { id: userId },
    create: { id: userId, ...data },
    update: data,
    select: viewFields,
  });
  return toView(row);
}
