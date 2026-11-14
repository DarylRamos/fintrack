// Turns system catalog rows into a list of RLS problems (invariant 4: RLS is on for every table in
// public, with no policies). Kept free of database code so a unit test can prove it reports
// problems without creating a bad table anywhere.

export interface TableRow {
  table: string;
  rlsEnabled: boolean;
}

export interface PolicyRow {
  table: string;
  policy: string;
}

export function findRlsProblems(tables: TableRow[], policies: PolicyRow[]): string[] {
  const problems: string[] = [];

  if (tables.length === 0) {
    problems.push("The public schema has no tables, so RLS can't be checked.");
  }

  for (const row of tables) {
    if (!row.rlsEnabled) {
      problems.push(`RLS is off on public.${row.table}.`);
    }
  }

  for (const row of policies) {
    problems.push(`public.${row.table} has a policy, ${row.policy}. App tables have none.`);
  }

  return problems;
}
