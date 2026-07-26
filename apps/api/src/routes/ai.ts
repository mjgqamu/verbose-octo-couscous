// SitePilot AI — AI Chat Routes
// Handles the AI receptionist chat endpoint and conversation management.

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, schema, eq, and, desc } from "@sitepilot/db";
import { requireAuth, orgContext } from "../middleware/auth.js";
import { notFound, badRequest } from "../lib/errors.js";
import { ReceptionistAgent } from "../services/ai/agent.js";
import type { OrgAIConfig } from "../services/ai/agent.js";
import { getHistory, addMessage, summarizeIfNeeded } from "../services/ai/memory.js";

const ai = new Hono();

// Apply auth to all routes
ai.use("*", requireAuth, orgContext);

// ---- Schemas ----

const chatSchema = z.object({
  message: z.string().min(1, "Message is required"),
  conversationId: z.string().uuid().optional(),
  channel: z.enum(["chat", "whatsapp", "voice"]).default("chat"),
});

const listConversationsSchema = z.object({
  limit: z.string().optional().transform((v) => (v ? parseInt(v) : undefined)),
  cursor: z.string().optional(),
});

// ---- Helpers ----

async function loadOrgAIConfig(orgId: string): Promise<OrgAIConfig> {
  // Load org details
  const [org] = await db
    .select({
      name: schema.organizations.name,
      businessHours: schema.organizations.businessHours,
    })
    .from(schema.organizations)
    .where(eq(schema.organizations.id, orgId))
    .limit(1);

  // Load active AI receptionist config
  const [aiConfig] = await db
    .select()
    .from(schema.aiConfigurations)
    .where(
      and(
        eq(schema.aiConfigurations.orgId, orgId),
        eq(schema.aiConfigurations.configType, "receptionist"),
        eq(schema.aiConfigurations.isActive, true),
      ),
    )
    .limit(1);

  const personality = (aiConfig?.personality as Record<string, unknown>) ?? {};
  const knowledgeBase = (aiConfig?.knowledgeBase as unknown[]) ?? [];

  return {
    businessName: org?.name ?? undefined,
    businessHours: (org?.businessHours as Record<string, unknown>) ?? {},
    services: Array.isArray(knowledgeBase)
      ? knowledgeBase.map((s: unknown) => {
          const svc = s as Record<string, unknown>;
          return (svc.name as string) ?? String(s);
        })
      : [],
    personality: {
      tone: (personality.tone as string) ?? "friendly and professional",
      greeting: (personality.greeting as string) ?? undefined,
      role: (personality.role as string) ?? "receptionist",
    },
    systemPrompt: (aiConfig?.systemPrompt as string) ?? undefined,
    model: aiConfig?.model ?? undefined,
  };
}

async function createConversation(
  orgId: string,
  title: string,
  channel: string,
): Promise<string> {
  const [conversation] = await db
    .insert(schema.conversations)
    .values({
      orgId,
      channel,
      subject: title.slice(0, 500),
      status: "active",
      isAiHandled: true,
      lastMessageAt: new Date(),
      messageCount: 0,
      metadata: {},
    })
    .returning();

  if (!conversation) {
    throw badRequest("Failed to create conversation");
  }

  return conversation.id;
}

// ---- Routes ----

// POST /api/v1/orgs/:orgId/ai/chat
ai.post("/chat", zValidator("json", chatSchema), async (c) => {
  const user = c.get("user");
  const { message, conversationId: existingConversationId, channel } = c.req.valid("json");

  let conversationId = existingConversationId;

  // Create a new conversation if needed
  if (!conversationId) {
    const title = message.slice(0, 100);
    conversationId = await createConversation(user.orgId, title, channel);
  } else {
    // Verify conversation belongs to org
    const [convo] = await db
      .select({ id: schema.conversations.id })
      .from(schema.conversations)
      .where(
        and(
          eq(schema.conversations.id, conversationId),
          eq(schema.conversations.orgId, user.orgId),
        ),
      )
      .limit(1);

    if (!convo) {
      throw notFound("Conversation not found");
    }
  }

  // Load conversation history
  let history = await getHistory(conversationId);
  history = await summarizeIfNeeded(history);

  // Load org AI config
  const orgConfig = await loadOrgAIConfig(user.orgId);

  // Create agent and process message
  const agent = new ReceptionistAgent(user.orgId, orgConfig, {
    orgId: user.orgId,
    conversationId,
    userId: user.id,
  });

  const result = await agent.chat(message, history);

  // Store user message
  await addMessage(conversationId, user.orgId, {
    role: "user",
    content: message,
  });

  // Store AI response
  await addMessage(conversationId, user.orgId, {
    role: "assistant",
    content: result.reply,
    tool_calls: undefined, // Tool calls stored in metadata if needed
  });

  return c.json({
    reply: result.reply,
    conversationId,
    toolCalls: result.toolCalls,
  });
});

// GET /api/v1/orgs/:orgId/ai/conversations
ai.get("/conversations", zValidator("query", listConversationsSchema), async (c) => {
  const user = c.get("user");
  const query = c.req.valid("query");
  const limit = query.limit ?? 20;

  const rows = await db
    .select()
    .from(schema.conversations)
    .where(
      and(
        eq(schema.conversations.orgId, user.orgId),
        eq(schema.conversations.isAiHandled, true),
      ),
    )
    .orderBy(desc(schema.conversations.lastMessageAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = data[data.length - 1];

  return c.json({
    data,
    pagination: {
      cursor: lastRow?.lastMessageAt?.toISOString() ?? null,
      hasMore,
      total: data.length,
    },
  });
});

// GET /api/v1/orgs/:orgId/ai/conversations/:id
ai.get("/conversations/:id", async (c) => {
  const user = c.get("user");
  const conversationId = c.req.param("id");

  const [conversation] = await db
    .select()
    .from(schema.conversations)
    .where(
      and(
        eq(schema.conversations.id, conversationId),
        eq(schema.conversations.orgId, user.orgId),
      ),
    )
    .limit(1);

  if (!conversation) throw notFound("Conversation not found");

  const messages = await db
    .select()
    .from(schema.messages)
    .where(
      and(
        eq(schema.messages.conversationId, conversationId),
        eq(schema.messages.orgId, user.orgId),
      ),
    )
    .orderBy(schema.messages.createdAt)
    .limit(200);

  return c.json({
    data: {
      ...conversation,
      messages,
    },
  });
});

export default ai;
