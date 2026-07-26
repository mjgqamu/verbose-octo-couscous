import { pgTable, uuid, varchar, text, boolean, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

export const automations = pgTable(
  "automations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    trigger: varchar("trigger", { length: 50 }).notNull(),
    triggerConfig: jsonb("trigger_config").default({}),
    conditions: jsonb("conditions").default([]),
    action: varchar("action", { length: 50 }).notNull(),
    actionConfig: jsonb("action_config").notNull(),
    isActive: boolean("is_active").default(true),
    delayMinutes: integer("delay_minutes").default(0),
    lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),
    runCount: integer("run_count").default(0),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_automations_org").on(table.orgId),
    index("idx_automations_trigger").on(table.orgId, table.trigger),
  ],
);

export const automationRuns = pgTable(
  "automation_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    automationId: uuid("automation_id").notNull().references(() => automations.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    triggerEntityType: varchar("trigger_entity_type", { length: 50 }).notNull(),
    triggerEntityId: uuid("trigger_entity_id").notNull(),
    result: jsonb("result").default({}),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_automation_runs_org").on(table.orgId),
    index("idx_automation_runs_automation").on(table.automationId),
  ],
);
