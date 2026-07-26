import { pgTable, uuid, varchar, smallint, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { customers } from "./customers";
import { jobs } from "./jobs";

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    customerId: uuid("customer_id").notNull().references(() => customers.id),
    jobId: uuid("job_id").references(() => jobs.id),
    rating: smallint("rating").notNull(),
    title: varchar("title", { length: 500 }),
    body: text("body"),
    response: text("response"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    source: varchar("source", { length: 50 }).default("sitepilot"),
    externalUrl: text("external_url"),
    isPublic: boolean("is_public").default(true),
    isFeatured: boolean("is_featured").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_reviews_org").on(table.orgId),
    index("idx_reviews_customer").on(table.customerId),
    index("idx_reviews_job").on(table.jobId),
  ],
);
