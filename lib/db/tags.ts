import "server-only";

import { db, type TxClient } from "./client";

// The only code that touches the `tags` table (unit 2.3). A tag exists while a transaction uses it: it is
// created by the first save that names it and deleted by the save or delete that leaves it unused
// (Question D). Names match ignoring case, keeping the first spelling. Every query filters on `userId`
// (invariant 3). Not cached (invariant 9). See context/feature-specs/2.3-categories-and-tags.md.

function byName(a: string, b: string): number {
  return a.localeCompare(b, "en", { sensitivity: "base" });
}

// The user's tag names, for the form's suggestions, sorted ignoring case.
export async function listTagNames(userId: string): Promise<string[]> {
  const rows = await db.tag.findMany({ where: { userId }, select: { name: true } });
  return rows.map((row) => row.name).sort(byName);
}

// The IDs of the user's tags with these names, creating the missing ones, in two queries: an insert that
// the unique name index turns into a no-op for names that exist (ON CONFLICT DO NOTHING, so a tag another
// save created a moment ago is fine too), then one read of the user's tags. The names come normalized
// from the schema (trimmed, no case duplicates). Matching compares them in code, not with a
// case-insensitive SQL pattern, so `_` and `%` in a name are never wildcards.
export async function resolveTags(tx: TxClient, userId: string, names: readonly string[]): Promise<string[]> {
  if (names.length === 0) {
    return [];
  }
  await tx.tag.createMany({ data: names.map((name) => ({ userId, name })), skipDuplicates: true });
  const rows = await tx.tag.findMany({ where: { userId }, select: { id: true, name: true } });
  const byKey = new Map(rows.map((row) => [row.name.toLowerCase(), row.id]));
  return names.map((name) => byKey.get(name.toLowerCase())).filter((id): id is string => id !== undefined);
}

// Deletes the user's tags that no transaction uses any more (Question D).
export async function deleteUnusedTags(tx: TxClient, userId: string): Promise<void> {
  await tx.tag.deleteMany({ where: { userId, transactions: { none: {} } } });
}
