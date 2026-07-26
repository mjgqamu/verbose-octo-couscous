import { pgTable, uuid, varchar, text, smallint, decimal, jsonb, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { customers } from "./customers";
import { leads } from "./leads";
import { quotes } from "./quotes";
import { users } from "./users";

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    number: varchar("number", { length: 50 }).notNull(),
    customerId: uuid("customer_id").notNull().references(() => customers.id),
    leadId: uuid("lead_id").references(() => leads.id),
    quoteId: uuid("quote_id").references(() => quotes.id),
    invoiceId: uuid("invoice_id"),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 50 }).notNull().default("new"),
    priority: smallint("priority").default(0),
    serviceType: varchar("service_type", { length: 200 }),
    scheduledStart: timestamp("scheduled_start", { withTimezone: true }),
    scheduledEnd: timestamp("scheduled_end", { withTimezone: true }),
    actualStart: timestamp("actual_start", { withTimezone: true }),
    actualEnd: timestamp("actual_end", { withTimezone: true }),
    assignedTechs: uuid("assigned_techs").array().default([]),
    addressLine1: varchar("address_line1", { length: 255 }),
    addressLine2: varchar("address_line2", { length: 255 }),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 100 }),
    postalCode: varchar("postal_code", { length: 20 }),
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),
    estimatedHours: decimal("estimated_hours", { precision: 5, scale: 2 }),
    actualHours: decimal("actual_hours", { precision: 5, scale: 2 }),
    notes: text("notes"),
    internalNotes: text("internal_notes"),
    tags: jsonb("tags").default([]),
    customFields: jsonb("custom_fields").default({}),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: varchar("cancel_reason", { length: 500 }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_jobs_org_number").on(table.orgId, table.number),
    index("idx_jobs_org").on(table.orgId),
    index("idx_jobs_org_status").on(table.orgId, table.status),
    index("idx_jobs_customer").on(table.customerId),
    index("idx_jobs_org_scheduled").on(table.orgId, table.scheduledStart),
  ],
);

export const jobActivities = pgTable(
  "job_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    jobId: uuid("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id),
    activityType: varchar("activity_type", { length: 50 }).notNull(),
    description: text("description"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_job_activities_job").on(table.jobId, table.createdAt),
    index("idx_job_activities_org").on(table.orgId),
  ],
);

export const jobPhotos = pgTable(
  "job_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    jobId: uuid("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id),
    url: text("url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    caption: varchar("caption", { length: 500 }),
    takenAt: timestamp("taken_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_job_photos_job").on(table.jobId),
    index("idx_job_photos_org").on(table.orgId),
  ],
);
