import { pgTable, uuid, varchar, boolean, integer, decimal, date, jsonb, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }).unique(),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    planTier: varchar("plan_tier", { length: 50 }).notNull(),
    status: varchar("status", { length: 50 }).notNull().default("incomplete"),
    seats: integer("seats").notNull().default(1),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
    totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("USD"),
    billingCycle: varchar("billing_cycle", { length: 10 }).default("monthly"),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
    paymentMethod: jsonb("payment_method").default({}),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_subscriptions_org").on(table.orgId),
    uniqueIndex("idx_subscriptions_org_active").on(table.orgId),
  ],
);

export const usageRecords = pgTable(
  "usage_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
    metric: varchar("metric", { length: 50 }).notNull(),
    quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
    unit: varchar("unit", { length: 20 }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_usage_org").on(table.orgId),
    index("idx_usage_org_period").on(table.orgId, table.periodStart, table.periodEnd),
    index("idx_usage_subscription").on(table.subscriptionId),
  ],
);
