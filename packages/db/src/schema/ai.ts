import { pgTable, uuid, varchar, text, boolean, integer, jsonb, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const aiConfigurations = pgTable(
  "ai_configurations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    name: varchar("name", { length: 255 }).notNull(),
    configType: varchar("config_type", { length: 50 }).notNull(),
    model: varchar("model", { length: 100 }).notNull().default("gpt-4o"),
    systemPrompt: text("system_prompt").notNull(),
    personality: jsonb("personality").default({}),
    knowledgeBase: jsonb("knowledge_base").default([]),
    toolsEnabled: jsonb("tools_enabled").default([]),
    fallbackAction: varchar("fallback_action", { length: 50 }).default("escalate"),
    escalationRules: jsonb("escalation_rules").default({}),
    voiceId: varchar("voice_id", { length: 100 }),
    language: varchar("language", { length: 10 }).default("en"),
    maxTurns: integer("max_turns").default(20),
    isActive: boolean("is_active").default(false),
    isDefault: boolean("is_default").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_ai_configs_org").on(table.orgId),
    uniqueIndex("idx_ai_configs_org_type").on(table.orgId, table.configType),
  ],
);

export const aiKnowledgeDocuments = pgTable(
  "ai_knowledge_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    aiConfigId: uuid("ai_config_id").references(() => aiConfigurations.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    content: text("content").notNull(),
    contentType: varchar("content_type", { length: 50 }).default("text"),
    // embedding: vector(1536) — requires pgvector extension, omitted for initial scaffold
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_ai_knowledge_org").on(table.orgId),
    index("idx_ai_knowledge_config").on(table.aiConfigId),
  ],
);
