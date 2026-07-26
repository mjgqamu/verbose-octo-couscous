import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, schema, eq, and, desc } from "@sitepilot/db";
import { requireAuth, orgContext } from "../middleware/auth.js";
import { notFound, badRequest } from "../lib/errors.js";

const conversations = new Hono();

// Apply auth to all routes
conversations.use("*", requireAuth, orgContext);

// ---- Schemas ----
const listQuerySchema = z.object({
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  channel: z.string().optional(),
  limit: z.string().optional().transform((v) => (v ? parseInt(v) : undefined)),
  cursor: z.string().optional(),
});

const addMessageSchema = z.object({
  content: z.string().min(1),
  role: z.enum(["human", "ai", "system"]),
  senderId: z.string().uuid().optional(),
});

// GET /api/v1/orgs/:orgId/conversations
conversations.get("/", zValidator("query", listQuerySchema), async (c) => {
  const user = c.get("user");
  const query = c.req.valid("query");
  const limit = query.limit ?? 20;

  const conditions = [eq(schema.conversations.orgId, user.orgId)];

  if (query.leadId) conditions.push(eq(schema.conversations.leadId, query.leadId));
  if (query.customerId) conditions.push(eq(schema.conversations.customerId, query.customerId));
  if (query.channel) conditions.push(eq(schema.conversations.channel, query.channel));

  const rows = await db
    .select()
    .from(schema.conversations)
    .where(and(...conditions))
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

// GET /api/v1/orgs/:orgId/conversations/:id/messages
conversations.get("/:id/messages", async (c) => {
  const user = c.get("user");
  const conversationId = c.req.param("id");

  // Verify conversation belongs to org
  const [conversation] = await db
    .select({ id: schema.conversations.id })
    .from(schema.conversations)
    .where(and(eq(schema.conversations.id, conversationId), eq(schema.conversations.orgId, user.orgId)))
    .limit(1);

  if (!conversation) throw notFound("Conversation not found");

  const messages = await db
    .select()
    .from(schema.messages)
    .where(and(eq(schema.messages.conversationId, conversationId), eq(schema.messages.orgId, user.orgId)))
    .orderBy(desc(schema.messages.createdAt))
    .limit(100);

  return c.json({ data: messages.reverse() });
});

// POST /api/v1/orgs/:orgId/conversations/:id/messages
conversations.post("/:id/messages", zValidator("json", addMessageSchema), async (c) => {
  const user = c.get("user");
  const conversationId = c.req.param("id");
  const body = c.req.valid("json");

  // Verify conversation belongs to org
  const [conversation] = await db
    .select()
    .from(schema.conversations)
    .where(and(eq(schema.conversations.id, conversationId), eq(schema.conversations.orgId, user.orgId)))
    .limit(1);

  if (!conversation) throw notFound("Conversation not found");

  const [message] = await db
    .insert(schema.messages)
    .values({
      orgId: user.orgId,
      conversationId,
      role: body.role,
      senderId: body.senderId ?? null,
      content: body.content,
    })
    .returning();

  if (!message) throw badRequest("Failed to add message");

  // Update conversation metadata
  await db
    .update(schema.conversations)
    .set({
      lastMessageAt: new Date(),
      messageCount: (conversation.messageCount ?? 0) + 1,
      updatedAt: new Date(),
    })
    .where(eq(schema.conversations.id, conversationId));

  return c.json({ data: message }, 201);
});

export default conversations;
