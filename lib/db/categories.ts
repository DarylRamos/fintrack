import "server-only";

import { type CategoryView, sortCategories, STARTER_CATEGORIES } from "@/lib/categories/starter";
import { TRANSACTION_TYPES } from "@/lib/validation/transaction";

import { db } from "./client";

// The only code that touches the `categories` table (unit 2.3). Every query filters on `userId`, which
// always comes from the verified session (invariant 3). Returns plain values. Not cached (invariant 9).
// Whether a transaction's category is the user's own, of its type, is checked by the transactions'
// composite foreign key (lib/db/transactions.ts), not by a read here.
// See context/feature-specs/2.3-categories-and-tags.md, Data Layer.

const viewFields = { id: true, type: true, name: true } as const;

function starterRows(userId: string) {
  return TRANSACTION_TYPES.flatMap((type) => STARTER_CATEGORIES[type].map((name) => ({ userId, type, name })));
}

// The user's categories, alphabetical with Other last. A user with none gets the starter set first: a
// write during a read, because a transaction needs a real category ID to point at. The unique name index
// makes a second, simultaneous seed a no-op (ON CONFLICT DO NOTHING). Phase 14, which lets the user
// delete categories, must stop re-seeding a user who deleted them all.
export async function listCategories(userId: string): Promise<CategoryView[]> {
  const read = () => db.category.findMany({ where: { userId }, select: viewFields });
  let rows = await read();
  if (rows.length === 0) {
    await db.category.createMany({ data: starterRows(userId), skipDuplicates: true });
    rows = await read();
  }
  return sortCategories(rows);
}
