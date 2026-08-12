// SitePilot AI — Database entry point (dialect-aware)
// ---------------------------------------------------------------------------
// Exports a single `db`/`schema` surface that is selected at runtime:
//   - Default (production): PostgreSQL via postgres-js (packages/db/src/db.ts)
//   - SQLite (local dev/test): bun:sqlite (packages/db/src/sqlite/)
// Selected by setting `DB_DRIVER=sqlite` or `DATABASE_URL=file:./dev.db`
// (or sqlite:...). The PostgreSQL schema/connection code is untouched and
// remains the production path.
//
// The exported `db`/`schema` are typed as the PostgreSQL surface so existing
// application code typechecks identically in both modes — the SQLite schema
// mirrors the same table and column names.
// ---------------------------------------------------------------------------
import type * as pgSchema from "./schema/index";
import type { Database as PgDatabase } from "./db";
import { isSqliteConfigured, resolveSqlitePath } from "./sqlite/config";
import { sql, type SQL } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm/column";

export { isSqliteConfigured, resolveSqlitePath };

const useSqlite = isSqliteConfigured();

// Lazy-load the right driver so the unused one has no side effects
// (e.g. Postgres mode never opens a SQLite file and vice versa).
const client = useSqlite
  ? await import("./sqlite/index")
  : await import("./db");

export const db = client.db as unknown as PgDatabase;
export const schema = client.schema as unknown as typeof pgSchema;
export type Database = PgDatabase;

/**
 * Run pending migrations for the active dialect.
 * - SQLite: applies packages/db/src/sqlite/migrations (idempotent).
 * - PostgreSQL: no-op here; use `bun run migrate` (drizzle-kit push / migrate.ts).
 */
export async function runMigrations(): Promise<void> {
  if (!useSqlite) return;
  const { migrate } = await import("drizzle-orm/bun-sqlite/migrator");
  const { db: sqliteDb } = await import("./sqlite/db");
  const { fileURLToPath } = await import("node:url");
  const path = await import("node:path");
  const folder = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "sqlite/migrations",
  );
  await migrate(sqliteDb, { migrationsFolder: folder });
}

// ---------------------------------------------------------------------------
// Dialect-aware SQL helpers (used by API services so pg-specific SQL works on
// SQLite too). These keep the exact same behaviour on PostgreSQL while adding
// SQLite equivalents.
// ---------------------------------------------------------------------------

/** Case-insensitive search: ILIKE on Postgres, LIKE (already CI) on SQLite. */
export function iLike(column: AnyColumn | SQL, value: string | SQL): SQL<unknown> {
  return useSqlite
    ? sql`${column} LIKE ${value}`
    : sql`${column} ILIKE ${value}`;
}

/** Array membership: `value = ANY(col)` on Postgres, json_each scan on SQLite. */
export function arrayContains(column: AnyColumn | SQL, value: string | SQL): SQL {
  return useSqlite
    ? sql`EXISTS (SELECT 1 FROM json_each(${column}) WHERE json_each.value = ${value})`
    : sql`${value} = ANY(${column})`;
}

/** Day-truncated timestamp label: TO_CHAR(col,'YYYY-MM-DD') on PG, strftime on SQLite. */
export function dateTruncDay(column: AnyColumn | SQL): SQL {
  return useSqlite
    ? sql`strftime('%Y-%m-%d', ${column} / 1000, 'unixepoch')`
    : sql`TO_CHAR(${column}, 'YYYY-MM-DD')`;
}

/** Difference between two timestamp columns in hours (PG: EXTRACT(EPOCH), SQLite: ms diff). */
export function dateDiffHours(from: AnyColumn | SQL, to: AnyColumn | SQL): SQL {
  return useSqlite
    ? sql`((${to} - ${from}) / 3600000.0)`
    : sql`EXTRACT(EPOCH FROM (${to} - ${from})) / 3600`;
}

// ---- Standard Drizzle operators (same surface as before) ----
export {
  eq, and, or, isNull, isNotNull, gt, gte, lt, lte,
  inArray, notInArray, like, notLike, between, notBetween,
  desc, asc, sql, count, sum, avg, max, min,
} from "drizzle-orm";
