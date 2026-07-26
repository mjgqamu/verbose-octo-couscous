import { pgTable, uuid, varchar, text, boolean, integer, jsonb, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

// ---- 3.3.28: API Keys ----
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    userId: uuid("user_id").references(() => users.id),
    name: varchar("name", { length: 255 }).notNull(),
    keyHash: varchar("key_hash", { length: 255 }).notNull(),
    keyPrefix: varchar("key_prefix", { length: 10 }).notNull(),
    scopes: jsonb("scopes").default([]),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_api_keys_org").on(table.orgId),
    uniqueIndex("idx_api_keys_hash").on(table.keyHash),
  ],
);

// ---- 3.3.29: Notifications ----
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    type: varchar("type", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body"),
    isRead: boolean("is_read").default(false),
    actionUrl: text("action_url"),
    entityType: varchar("entity_type", { length: 50 }),
    entityId: uuid("entity_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_notifications_user").on(table.userId, table.createdAt),
    index("idx_notifications_org").on(table.orgId),
    index("idx_notifications_user_unread").on(table.userId, table.isRead),
  ],
);

// ---- 3.3.30: Webhook Endpoints ----
export const webhookEndpoints = pgTable(
  "webhook_endpoints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    name: varchar("name", { length: 255 }).notNull(),
    url: text("url").notNull(),
    secret: varchar("secret", { length: 255 }).notNull(),
    events: jsonb("events").notNull().default([]),
    isActive: boolean("is_active").default(true),
    lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
    failureCount: integer("failure_count").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_webhooks_org").on(table.orgId),
  ],
);

// ---- 3.3.31: Webhook Deliveries ----
export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    endpointId: uuid("endpoint_id").notNull().references(() => webhookEndpoints.id, { onDelete: "cascade" }),
    event: varchar("event", { length: 100 }).notNull(),
    payload: jsonb("payload").notNull(),
    responseStatus: integer("response_status"),
    responseBody: text("response_body"),
    attemptCount: integer("attempt_count").default(1),
    status: varchar("status", { length: 20 }).default("pending"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_webhook_deliveries_endpoint").on(table.endpointId),
    index("idx_webhook_deliveries_org").on(table.orgId),
    index("idx_webhook_deliveries_retry").on(table.status, table.nextRetryAt),
  ],
);
