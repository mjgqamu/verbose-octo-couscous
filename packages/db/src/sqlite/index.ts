// SQLite driver entry — mirrors the shape of packages/db/src/db.ts (pg)
// so the dialect switcher can select either transparently.
import { db, type Database } from "./db";
import * as schema from "./schema";

export { db, schema };
export type { Database };
