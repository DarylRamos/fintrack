import { Client } from "pg";
import { afterAll, beforeAll, expect, test } from "vitest";

import { findRlsProblems, type PolicyRow, type TableRow } from "./rls-check";

// Invariant 4, checked on the database CI builds from every migration. Reads system catalogs only.
// Uses pg, not Prisma Client, which stays inside lib/db (invariant 3).

const client = new Client({ connectionString: process.env.DIRECT_URL });

beforeAll(async () => {
  await client.connect();
});

afterAll(async () => {
  await client.end();
});

test("every table in public has RLS on and no policies", async () => {
  const tables = await client.query<TableRow>(`
    select c.relname as "table", c.relrowsecurity as "rlsEnabled"
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
    order by c.relname
  `);
  const policies = await client.query<PolicyRow>(`
    select tablename as "table", policyname as "policy"
    from pg_policies
    where schemaname = 'public'
    order by tablename, policyname
  `);

  expect(findRlsProblems(tables.rows, policies.rows)).toEqual([]);
});
