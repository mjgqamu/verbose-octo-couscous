// SitePilot AI — SQLite migrations runner (dev / testing)
// Run: bun run src/sqlite/migrate.ts  (or `bun run migrate:sqlite` from the db package)
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "./db";
import { fileURLToPath } from "node:url";
import path from "node:path";

async function main() {
  const folder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "migrations");
  console.log(`Running SQLite migrations from ${folder} ...`);
  await migrate(db, { migrationsFolder: folder });
  console.log("SQLite migrations complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("SQLite migration failed:", err);
  process.exit(1);
});
