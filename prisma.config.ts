import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// Load .env.local the same way `next dev` does. Variables already set in the shell win, which is
// how a single production command passes its own DIRECT_URL.
loadEnvConfig(process.cwd(), true);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // The session pooler (port 5432). Migrations can't run through the transaction pooler.
    // Read directly rather than with Prisma's env(), which throws when the variable is unset,
    // so `prisma generate` still works without a database (for example, on CI).
    url: process.env.DIRECT_URL,
  },
});
