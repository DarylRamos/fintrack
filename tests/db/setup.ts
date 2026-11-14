// Database tests run only on CI, against a throwaway Postgres that the workflow creates and
// discards. They never run against either Supabase project. See context/code-standards.md.
// No env files are loaded: DIRECT_URL must come from the environment, which only CI sets.
// The messages below never include the connection string.

const url = process.env.DIRECT_URL;

if (!url) {
  throw new Error(
    "Database tests run on CI against a throwaway Postgres. See context/code-standards.md.",
  );
}

let host: string;
try {
  host = new URL(url).hostname.toLowerCase();
} catch {
  throw new Error("DIRECT_URL is not a valid connection URL.");
}

// Covers Supabase's pooler hosts (*.pooler.supabase.com) and direct hosts (db.<ref>.supabase.co),
// including a production DIRECT_URL left set in the shell after a migration.
if (host.endsWith("supabase.com") || host.endsWith("supabase.co")) {
  throw new Error("Database tests never run against Supabase.");
}
