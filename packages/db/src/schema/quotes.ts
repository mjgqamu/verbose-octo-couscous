import { pgTable, uuid, varchar, text, boolean, decimal, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { leads } from "./leads";
import { customers } from "./customers";
import { users } from "./users";

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    number: varchar("number", { length: 50 }).notNull(),
    leadId: uuid("lead_id").references(() => leads.id),
    customerId: uuid("customer_id").notNull().references(() => customers.id),
    jobId: uuid("job_id"),
    status: varchar("status", { length: 50 }).notNull().default("draft"),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
    discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0"),
    discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default("0"),
    taxRate: decimal("tax_rate", { precision: 5, scale: 4 }).default("0"),
    taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),
    total: decimal("total", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("USD"),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    terms: text("terms"),
    pdfUrl: text("pdf_url"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    declinedAt: timestamp("declined_at", { withTimezone: true }),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_quotes_org_number").on(table.orgId, table.number),
    index("idx_quotes_org").on(table.orgId),
    index("idx_quotes_org_status").on(table.orgId, table.status),
    index("idx_quotes_customer").on(table.customerId),
    index("idx_quotes_lead").on(table.leadId),
  ],
);

export const quoteLineItems = pgTable(
  "quote_line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    quoteId: uuid("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
    description: varchar("description", { length: 500 }).notNull(),
    quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
    unit: varchar("unit", { length: 50 }).default("ea"),
    unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
    total: decimal("total", { precision: 12, scale: 2 }).notNull(),
    isLabor: boolean("is_labor").default(false),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_quote_items_quote").on(table.quoteId),
    index("idx_quote_items_org").on(table.orgId),
  ],
);
