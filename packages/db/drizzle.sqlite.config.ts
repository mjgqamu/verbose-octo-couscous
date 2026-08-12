import { defineConfig } from "drizzle-kit";

// SQLite (dev/testing) Drizzle Kit config — generates migrations for the
// SQLite schema into src/sqlite/migrations.
// Usage: bunx drizzle-kit generate --config=drizzle.sqlite.config.ts
export default defineConfig({
  schema: "./src/sqlite/schema.ts",
  out: "./src/sqlite/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.SQLITE_DB_URL ?? "./dev.db",
  },
});
