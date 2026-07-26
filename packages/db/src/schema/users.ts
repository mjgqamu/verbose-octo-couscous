import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").references(() => organizations.id),
    email: varchar("email", { length: 255 }).notNull(),
    emailVerified: boolean("email_verified").default(false),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 50 }),
    avatarUrl: text("avatar_url"),
    role: varchar("role", { length: 50 }).notNull().default("business_owner"),
    permissions: jsonb("permissions").default([]),
    isActive: boolean("is_active").default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    refreshToken: text("refresh_token"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    settings: jsonb("settings").default({}),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_users_email_org").on(table.orgId, table.email),
    index("idx_users_org").on(table.orgId),
    index("idx_users_refresh_token").on(table.refreshToken),
  ],
);
