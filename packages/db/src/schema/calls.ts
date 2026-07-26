import { pgTable, uuid, varchar, text, integer, boolean, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { conversations } from "./conversations";
import { leads } from "./leads";
import { customers } from "./customers";

export const calls = pgTable(
  "calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    conversationId: uuid("conversation_id").references(() => conversations.id),
    leadId: uuid("lead_id").references(() => leads.id),
    customerId: uuid("customer_id").references(() => customers.id),
    twilioCallSid: varchar("twilio_call_sid", { length: 255 }).unique(),
    fromNumber: varchar("from_number", { length: 50 }).notNull(),
    toNumber: varchar("to_number", { length: 50 }).notNull(),
    direction: varchar("direction", { length: 10 }).notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    duration: integer("duration"),
    recordingUrl: text("recording_url"),
    transcription: text("transcription"),
    summary: text("summary"),
    sentiment: varchar("sentiment", { length: 20 }),
    intent: varchar("intent", { length: 100 }),
    aiHandled: boolean("ai_handled").default(false),
    aiHandoffAt: timestamp("ai_handoff_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_calls_org").on(table.orgId),
    index("idx_calls_org_timestamp").on(table.orgId, table.startedAt),
    index("idx_calls_customer").on(table.customerId),
    index("idx_calls_lead").on(table.leadId),
  ],
);
