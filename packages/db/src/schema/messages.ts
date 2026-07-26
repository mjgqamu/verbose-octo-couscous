import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { conversations } from "./conversations";
import { users } from "./users";

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull(),
    senderId: uuid("sender_id").references(() => users.id),
    content: text("content").notNull(),
    contentHtml: text("content_html"),
    attachments: jsonb("attachments").default([]),
    metadata: jsonb("metadata").default({}),
    twilioSid: varchar("twilio_sid", { length: 255 }),
    readAt: timestamp("read_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_messages_conversation").on(table.conversationId, table.createdAt),
    index("idx_messages_org").on(table.orgId),
  ],
);
