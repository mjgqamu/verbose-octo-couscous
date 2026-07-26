import { pgTable, uuid, varchar, text, integer, decimal, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { customers } from "./customers";
import { jobs } from "./jobs";
import { quotes } from "./quotes";

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    number: varchar("number", { length: 50 }).notNull(),
    customerId: uuid("customer_id").notNull().references(() => customers.id),
    jobId: uuid("job_id").references(() => jobs.id),
    quoteId: uuid("quote_id").references(() => quotes.id),
    status: varchar("status", { length: 50 }).notNull().default("draft"),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
    discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0"),
    taxRate: decimal("tax_rate", { precision: 5, scale: 4 }).default("0"),
    taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),
    total: decimal("total", { precision: 12, scale: 2 }).notNull(),
    amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).default("0"),
    balanceDue: decimal("balance_due", { precision: 12, scale: 2 }),
    currency: varchar("currency", { length: 3 }).default("USD"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    lastPaymentAt: timestamp("last_payment_at", { withTimezone: true }),
    notes: text("notes"),
    terms: text("terms"),
    pdfUrl: text("pdf_url"),
    stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_invoices_org_number").on(table.orgId, table.number),
    index("idx_invoices_org").on(table.orgId),
    index("idx_invoices_org_status").on(table.orgId, table.status),
    index("idx_invoices_customer").on(table.customerId),
    index("idx_invoices_job").on(table.jobId),
  ],
);

export const invoiceLineItems = pgTable(
  "invoice_line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
    description: varchar("description", { length: 500 }).notNull(),
    quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
    unit: varchar("unit", { length: 50 }).default("ea"),
    unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
    total: decimal("total", { precision: 12, scale: 2 }).notNull(),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_invoice_items_invoice").on(table.invoiceId),
    index("idx_invoice_items_org").on(table.orgId),
  ],
);
