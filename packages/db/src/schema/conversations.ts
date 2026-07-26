import { pgTable, uuid, varchar, text, boolean, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { customers } from "./customers";
import { leads } from "./leads";
import { users } from "./users";

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    customerId: uuid("customer_id").references(() => customers.id),
    leadId: uuid("lead_id").references(() => leads.id),
    channel: varchar("channel", { length: 50 }).notNull(),
    externalId: varchar("external_id", { length: 500 }),
    subject: varchar("subject", { length: 500 }),
    status: varchar("status", { length: 20 }).default("active"),
    assignedTo: uuid("assigned_to").references(() => users.id),
    isAiHandled: boolean("is_ai_handled").default(false),
    aiEscalated: boolean("ai_escalated").default(false),
    escalationReason: text("escalation_reason"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    messageCount: integer("message_count").default(0),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_conversations_org").on(table.orgId),
    index("idx_conversations_customer").on(table.customerId),
    index("idx_conversations_external").on(table.externalId),
    index("idx_conversations_org_channel").on(table.orgId, table.channel),
  ],
);
