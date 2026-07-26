// SitePilot AI — AI Settings Routes
// Admin CRUD for AI configuration and knowledge base documents.
// Protected: requireAuth + business_owner role for mutations.

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, schema, eq, and } from "@sitepilot/db";
import { requireAuth, orgContext, requireRole } from "../middleware/auth.js";
import { notFound, badRequest } from "../lib/errors.js";

const aiSettings = new Hono();

// Apply auth to all routes
aiSettings.use("*", requireAuth, orgContext);

// ---- Schemas ----

const updateSettingsSchema = z.object({
  personality: z
    .object({
      tone: z.string().max(200).optional(),
      greeting: z.string().max(1000).optional(),
      role: z.string().max(100).optional(),
    })
    .optional(),
  systemPrompt: z.string().max(5000).optional(),
  businessHours: z.record(z.string()).optional(),
  services: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  model: z.string().max(100).optional(),
  fallbackAction: z.string().max(50).optional(),
  maxTurns: z.number().int().min(1).max(50).optional(),
});

const addKnowledgeSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  content: z.string().min(1, "Content is required"),
});

// ---- GET /api/v1/orgs/:orgId/ai/settings ----
aiSettings.get("/settings", async (c) => {
  const user = c.get("user");

  // Get or create default receptionist config
  let [config] = await db
    .select()
    .from(schema.aiConfigurations)
    .where(
      and(
        eq(schema.aiConfigurations.orgId, user.orgId),
        eq(schema.aiConfigurations.configType, "receptionist"),
      ),
    )
    .limit(1);

  if (!config) {
    // Create a default config if none exists
    const [org] = await db
      .select({ name: schema.organizations.name })
      .from(schema.organizations)
      .where(eq(schema.organizations.id, user.orgId))
      .limit(1);

    const [newConfig] = await db
      .insert(schema.aiConfigurations)
      .values({
        orgId: user.orgId,
        name: `${org?.name ?? "Default"} Receptionist`,
        configType: "receptionist",
        model: "gpt-4o-mini",
        systemPrompt: `You are a friendly and professional receptionist for ${org?.name ?? "our business"}. Help customers with their inquiries, book appointments, and create leads.`,
        personality: {
          tone: "friendly and professional",
          greeting: "Hello! How can I help you today?",
          role: "receptionist",
        },
        knowledgeBase: [],
        toolsEnabled: [
          "create_lead",
          "check_availability",
          "book_appointment",
          "search_knowledge",
          "escalate_to_human",
          "get_business_info",
        ],
        fallbackAction: "escalate",
        isActive: false,
      })
      .returning();

    config = newConfig ?? undefined;
  }

  if (!config) {
    throw notFound("AI configuration not found");
  }

  return c.json({ data: config });
});

// ---- PATCH /api/v1/orgs/:orgId/ai/settings ----
aiSettings.patch(
  "/settings",
  requireRole("business_owner"),
  zValidator("json", updateSettingsSchema),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");

    // Find existing config
    const [existing] = await db
      .select()
      .from(schema.aiConfigurations)
      .where(
        and(
          eq(schema.aiConfigurations.orgId, user.orgId),
          eq(schema.aiConfigurations.configType, "receptionist"),
        ),
      )
      .limit(1);

    if (!existing) {
      throw notFound("AI configuration not found. Create one first via GET /settings.");
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (body.personality) {
      updates.personality = {
        ...((existing.personality as Record<string, unknown>) ?? {}),
        ...body.personality,
      };
    }

    if (body.systemPrompt !== undefined) updates.systemPrompt = body.systemPrompt;
    if (body.isActive !== undefined) updates.isActive = body.isActive;
    if (body.model !== undefined) updates.model = body.model;
    if (body.fallbackAction !== undefined) updates.fallbackAction = body.fallbackAction;
    if (body.maxTurns !== undefined) updates.maxTurns = body.maxTurns;

    if (body.services !== undefined) {
      updates.knowledgeBase = body.services.map((s) => ({ name: s }));
    }

    const [updated] = await db
      .update(schema.aiConfigurations)
      .set(updates)
      .where(eq(schema.aiConfigurations.id, existing.id))
      .returning();

    if (!updated) {
      throw badRequest("Failed to update AI settings");
    }

    return c.json({ data: updated });
  },
);

// ---- GET /api/v1/orgs/:orgId/ai/knowledge ----
aiSettings.get("/knowledge", async (c) => {
  const user = c.get("user");

  const docs = await db
    .select()
    .from(schema.aiKnowledgeDocuments)
    .where(eq(schema.aiKnowledgeDocuments.orgId, user.orgId))
    .orderBy(schema.aiKnowledgeDocuments.updatedAt);

  return c.json({ data: docs });
});

// ---- POST /api/v1/orgs/:orgId/ai/knowledge ----
aiSettings.post(
  "/knowledge",
  requireRole("business_owner"),
  zValidator("json", addKnowledgeSchema),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");

    // Get the receptionist AI config for linking
    const [aiConfig] = await db
      .select({ id: schema.aiConfigurations.id })
      .from(schema.aiConfigurations)
      .where(
        and(
          eq(schema.aiConfigurations.orgId, user.orgId),
          eq(schema.aiConfigurations.configType, "receptionist"),
        ),
      )
      .limit(1);

    const [doc] = await db
      .insert(schema.aiKnowledgeDocuments)
      .values({
        orgId: user.orgId,
        aiConfigId: aiConfig?.id ?? null,
        title: body.title,
        content: body.content,
        contentType: "text",
        metadata: {},
      })
      .returning();

    if (!doc) {
      throw badRequest("Failed to create knowledge document");
    }

    return c.json({ data: doc }, 201);
  },
);

// ---- DELETE /api/v1/orgs/:orgId/ai/knowledge/:id ----
aiSettings.delete(
  "/knowledge/:id",
  requireRole("business_owner"),
  async (c) => {
    const user = c.get("user");
    const docId = c.req.param("id")!;

    // Verify document belongs to org
    const [existing] = await db
      .select({ id: schema.aiKnowledgeDocuments.id })
      .from(schema.aiKnowledgeDocuments)
      .where(
        and(
          eq(schema.aiKnowledgeDocuments.id, docId),
          eq(schema.aiKnowledgeDocuments.orgId, user.orgId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw notFound("Knowledge document not found");
    }

    await db
      .delete(schema.aiKnowledgeDocuments)
      .where(eq(schema.aiKnowledgeDocuments.id, docId));

    return c.json({ success: true });
  },
);

export default aiSettings;
