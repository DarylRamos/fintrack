import { defineConfig } from "vitest/config";

// Two projects. Run them through the npm scripts, not bare `vitest`:
// - unit (`npm test`): no database and no secrets.
// - db (`npm run test:db`): CI's throwaway Postgres only. See context/code-standards.md.
export default defineConfig({
  resolve: {
    // The "@/*" alias from tsconfig.json. Vite 8 resolves tsconfig paths itself.
    tsconfigPaths: true,
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          // .tsx for the error pages' render tests (unit 1.2b).
          include: ["tests/unit/**/*.test.{ts,tsx}"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          include: ["tests/db/**/*.test.ts"],
          environment: "node",
          setupFiles: ["tests/db/setup.ts"],
          // Later database tests write to the same database, so files run one at a time.
          fileParallelism: false,
        },
      },
    ],
  },
});
