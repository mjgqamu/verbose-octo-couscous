// SitePilot AI — minimal ambient types for `bun:sqlite`.
// Keeps `tsc` (used by Vercel builds, where the Bun runtime is absent) able to
// type-check packages/db/src/sqlite/* without installing bun-types. The Bun
// runtime itself provides the real module at run time. Mirrors the declaration
// in apps/api/src/bun-sqlite.d.ts so both the standalone db build (turbo) and
// the apps/api build resolve the module.
declare module "bun:sqlite" {
  export class Database {
    constructor(filename?: string, options?: number | object);
    exec(query: string): void;
    close(): void;
  }
}
