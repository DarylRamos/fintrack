import "server-only";

import { db } from "./client";

// A read-only database check for the daily heartbeat. It touches no table, so it needs no userId.
// Throws if the database can't be reached.
export async function checkDatabase(): Promise<void> {
  await db.$queryRaw`SELECT 1`;
}
