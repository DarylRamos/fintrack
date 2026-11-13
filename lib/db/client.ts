import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/prisma/client";

// The one shared Prisma Client. Only files in lib/db/ may import it (architecture invariant 3).

function createClient(): PrismaClient {
  // The transaction pooler (port 6543), which suits serverless functions.
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// Keep one instance across hot reloads in development, so `next dev` doesn't open a new pool on
// every change.
const globalForDb = globalThis as typeof globalThis & { fintrackDb?: PrismaClient };

export const db = globalForDb.fintrackDb ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.fintrackDb = db;
}
