import { pgTable, uuid, varchar, text, smallint, decimal, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { customers } from "./customers";
import { users } from "./users";

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    customerId: uuid("customer_id").references(() => customers.id),
    contactName: varchar("contact_name", { length: 200 }),
    contactPhone: varchar("contact_phone", { length: 50 }),
    contactEmail: varchar("contact_email", { length: 255 }),
    source: varchar("source", { length: 50 }).notNull().default("phone_call"),
    sourceDetail: varchar("source_detail", { length: 500 }),
    stage: varchar("stage", { length: 50 }).notNull().default("new"),
    priority: smallint("priority").default(0),
    title: varchar("title", { length: 500 }),
    description: text("description"),
    serviceType: varchar("service_type", { length: 200 }),
    estimatedValue: decimal("estimated_value", { precision: 12, scale: 2 }),
    assignedTo: uuid("assigned_to").references(() => users.id),
    convertedToJobId: uuid("converted_to_job_id"),
    lostReason: text("lost_reason"),
    tags: jsonb("tags").default([]),
    customFields: jsonb("custom_fields").default({}),
    dealSize: decimal("deal_size", { precision: 12, scale: 2 }),
    nextFollowUp: timestamp("next_follow_up", { withTimezone: true }),
    aiScore: smallint("ai_score"),
    aiScoreBreakdown: jsonb("ai_score_breakdown"),
    aiAnalysis: text("ai_analysis"),
    aiCategory: varchar("ai_category", { length: 50 }),
    aiActions: jsonb("ai_actions"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_leads_org").on(table.orgId),
    index("idx_leads_org_stage").on(table.orgId, table.stage),
    index("idx_leads_assigned").on(table.assignedTo),
    index("idx_leads_customer").on(table.customerId),
  ],
);

export const leadActivities = pgTable(
  "lead_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id),
    activityType: varchar("activity_type", { length: 50 }).notNull(),
    description: text("description"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_lead_activities_lead").on(table.leadId, table.createdAt),
    index("idx_lead_activities_org").on(table.orgId),
  ],
);
