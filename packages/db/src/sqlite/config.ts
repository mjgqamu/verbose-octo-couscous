// SQLite config helpers — pure, no side effects (safe to import from the
// dialect switcher without opening a DB connection).
import { fileURLToPath } from "node:url";
import path from "node:path";

export function isSqliteConfigured(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return (
    process.env.DB_DRIVER === "sqlite" ||
    url.startsWith("file:") ||
    url.startsWith("sqlite:")
  );
}

/** Resolve the SQLite file path from DATABASE_URL / SQLITE_DB_URL. */
export function resolveSqlitePath(): string {
  const raw =
    process.env.SQLITE_DB_URL ??
    process.env.DATABASE_URL ??
    "file:./dev.db";
  let file = raw
    .replace(/^sqlite:\/\//, "")
    .replace(/^file:/, "")
    .replace(/^sqlite:/, "");
  if (file === ":memory:" || file.startsWith(":memory:")) return ":memory:";
  if (!path.isAbsolute(file)) {
    // Resolve relative to packages/db so every tool shares the same file
    // regardless of the working directory (migrate / seed / API).
    const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
    file = path.join(pkgRoot, file);
  }
  return file;
}
