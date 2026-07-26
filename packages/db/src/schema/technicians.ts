import { pgTable, uuid, varchar, boolean, decimal, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

export const technicians = pgTable(
  "technicians",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    userId: uuid("user_id").references(() => users.id),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    employeeId: varchar("employee_id", { length: 50 }),
    title: varchar("title", { length: 200 }),
    skills: jsonb("skills").default([]),
    serviceArea: jsonb("service_area").default({}),
    hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
    isActive: boolean("is_active").default(true),
    color: varchar("color", { length: 7 }),
    maxJobsPerDay: integer("max_jobs_per_day").default(8),
    workSchedule: jsonb("work_schedule").default({}),
    googleCalendarId: varchar("google_calendar_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_technicians_org").on(table.orgId),
    index("idx_technicians_user").on(table.userId),
  ],
);
