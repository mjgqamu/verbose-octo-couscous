import { pgTable, uuid, varchar, text, decimal, timestamp, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { invoices } from "./invoices";
import { customers } from "./customers";

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    invoiceId: uuid("invoice_id").notNull().references(() => invoices.id),
    customerId: uuid("customer_id").notNull().references(() => customers.id),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    method: varchar("method", { length: 50 }).notNull(),
    transactionId: varchar("transaction_id", { length: 255 }),
    receiptUrl: text("receipt_url"),
    status: varchar("status", { length: 20 }).notNull().default("completed"),
    notes: text("notes"),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_payments_invoice").on(table.invoiceId),
    index("idx_payments_org").on(table.orgId),
    index("idx_payments_customer").on(table.customerId),
  ],
);
