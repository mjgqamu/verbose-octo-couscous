import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    userId: uuid("user_id").references(() => users.id),
    eventName: varchar("event_name", { length: 100 }).notNull(),
    eventCategory: varchar("event_category", { length: 50 }).notNull(),
    properties: jsonb("properties").default({}),
    sessionId: varchar("session_id", { length: 255 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_analytics_org_time").on(table.orgId, table.createdAt),
    index("idx_analytics_org_event").on(table.orgId, table.eventName, table.createdAt),
    index("idx_analytics_org_category").on(table.orgId, table.eventCategory, table.createdAt),
  ],
);
