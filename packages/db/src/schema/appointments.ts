import { pgTable, uuid, varchar, text, boolean, decimal, timestamp, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { customers } from "./customers";
import { leads } from "./leads";

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    customerId: uuid("customer_id").notNull().references(() => customers.id),
    leadId: uuid("lead_id").references(() => leads.id),
    jobId: uuid("job_id"),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 50 }).notNull().default("scheduled"),
    scheduledStart: timestamp("scheduled_start", { withTimezone: true }).notNull(),
    scheduledEnd: timestamp("scheduled_end", { withTimezone: true }).notNull(),
    actualStart: timestamp("actual_start", { withTimezone: true }),
    actualEnd: timestamp("actual_end", { withTimezone: true }),
    timezone: varchar("timezone", { length: 50 }).notNull(),
    assignedTechnicians: uuid("assigned_technicians").array().default([]),
    addressLine1: varchar("address_line1", { length: 255 }),
    addressLine2: varchar("address_line2", { length: 255 }),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 100 }),
    postalCode: varchar("postal_code", { length: 20 }),
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),
    notes: text("notes"),
    isAllDay: boolean("is_all_day").default(false),
    recurrenceRule: text("recurrence_rule"),
    googleEventId: varchar("google_event_id", { length: 255 }),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    confirmationSentAt: timestamp("confirmation_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_appointments_org").on(table.orgId),
    index("idx_appointments_org_range").on(table.orgId, table.scheduledStart, table.scheduledEnd),
    index("idx_appointments_customer").on(table.customerId),
    index("idx_appointments_job").on(table.jobId),
  ],
);
