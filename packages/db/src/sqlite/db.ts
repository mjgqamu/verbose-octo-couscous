// SitePilot AI — SQLite connection (local dev / testing)
// ---------------------------------------------------------------------------
// Uses bun:sqlite (built into the Bun runtime) + Drizzle's bun-sqlite driver.
// NOTE: The original brief specified `better-sqlite3`, but its native addon
// crashes the Bun runtime on this machine (NAPI FATAL ERROR at load). bun:sqlite
// is the same file-based SQLite semantics with zero extra dependencies and is
// the supported path for Bun — see E2E_REPORT.md for details.
//
// Selection: set `DB_DRIVER=sqlite` or `DATABASE_URL=file:./dev.db` (or
// sqlite:...). The DB file path is resolved relative to the db package root
// (packages/db) so migrate/seed/API all share one file regardless of cwd.
// ---------------------------------------------------------------------------
import { Database as BunDatabase } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";
import { resolveSqlitePath } from "./config";

function createClient() {
  const file = resolveSqlitePath();
  const sqlite = new BunDatabase(file);
  // Mirrors better-sqlite3 defaults: enforce FKs + WAL for dev concurrency.
  sqlite.exec("PRAGMA foreign_keys = ON;");
  try {
    sqlite.exec("PRAGMA journal_mode = WAL;");
  } catch {
    // in-memory DBs ignore journal mode
  }
  return sqlite;
}

export const sqliteClient = createClient();
export const db = drizzle(sqliteClient, { schema });
export type Database = typeof db;
