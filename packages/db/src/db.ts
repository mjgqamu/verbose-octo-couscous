import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

const connectionString = process.env.DATABASE_URL ?? "postgresql://sitepilot:sitepilot@localhost:5432/sitepilot";

const client = postgres(connectionString, { max: 10 });
export const db = drizzle(client, { schema });

export { schema };
export type Database = typeof db;
