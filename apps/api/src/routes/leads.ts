import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth, orgContext } from "../middleware/auth.js";
import { requireRole } from "../middleware/auth.js";
import * as leadsService from "../services/leads.js";
import { getLeadScorer } from "../services/ai/lead-scorer.js";
import { notFound, badRequest } from "../lib/errors.js";

const leads = new Hono();

// Apply auth to all routes
leads.use("*", requireAuth, orgContext);

// ---- Schemas ----
const listQuerySchema = z.object({
  stage: z.string().optional(),
  source: z.string().optional(),
  search: z.string().optional(),
  assignedTo: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.string().optional().transform((v) => (v ? parseInt(v) : undefined)),
  cursor: z.string().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

const createLeadSchema = z.object({
  customerId: z.string().uuid().optional(),
  contactName: z.string().max(200).optional(),
  contactPhone: z.string().max(50).optional(),
  contactEmail: z.string().email().max(255).optional(),
  source: z.string().max(50).optional(),
  sourceDetail: z.string().max(500).optional(),
  stage: z.string().max(50).optional(),
  priority: z.number().int().min(0).max(10).optional(),
  title: z.string().max(500).optional(),
  description: z.string().optional(),
  serviceType: z.string().max(200).optional(),
  estimatedValue: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

const updateLeadSchema = z.object({
  stage: z.string().max(50).optional(),
  priority: z.number().int().min(0).max(10).optional(),
  title: z.string().max(500).optional(),
  description: z.string().optional(),
  serviceType: z.string().max(200).optional(),
  estimatedValue: z.string().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  contactName: z.string().max(200).optional(),
  contactPhone: z.string().max(50).optional(),
  contactEmail: z.string().email().max(255).optional(),
  source: z.string().max(50).optional(),
  sourceDetail: z.string().max(500).optional(),
  lostReason: z.string().optional(),
  tags: z.array(z.string()).optional(),
  nextFollowUp: z.string().optional(),
  dealSize: z.string().optional(),
});

const addActivitySchema = z.object({
  activityType: z.string().min(1).max(50),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ---- Pipeline ----
leads.get("/pipeline", async (c) => {
  const user = c.get("user");
  const data = await leadsService.getPipeline(user.orgId);
  return c.json({ data });
});

// GET /api/v1/orgs/:orgId/leads
leads.get("/", zValidator("query", listQuerySchema), async (c) => {
  const user = c.get("user");
  const query = c.req.valid("query");

  const result = await leadsService.listLeads({
    orgId: user.orgId,
    stage: query.stage,
    source: query.source,
    search: query.search,
    assignedTo: query.assignedTo,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    limit: query.limit ?? 20,
    cursor: query.cursor,
    sortBy: query.sortBy,
    sortDir: query.sortDir ?? "desc",
  });

  return c.json(result);
});

// GET /api/v1/orgs/:orgId/leads/:id
leads.get("/:id", async (c) => {
  const user = c.get("user");
  const leadId = c.req.param("id");

  const lead = await leadsService.getLead(user.orgId, leadId);
  if (!lead) throw notFound("Lead not found");

  return c.json({ data: lead });
});

// POST /api/v1/orgs/:orgId/leads
leads.post("/", zValidator("json", createLeadSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json") as z.infer<typeof createLeadSchema>;

  const lead = await leadsService.createLead({
    orgId: user.orgId,
    ...body,
  });

  if (!lead) throw badRequest("Failed to create lead");

  return c.json({ data: lead }, 201);
});

// PATCH /api/v1/orgs/:orgId/leads/:id
leads.patch("/:id", zValidator("json", updateLeadSchema), async (c) => {
  const user = c.get("user");
  const leadId = c.req.param("id");
  const body = c.req.valid("json");

  const lead = await leadsService.updateLead(user.orgId, leadId, body);
  if (!lead) throw notFound("Lead not found");

  return c.json({ data: lead });
});

// DELETE /api/v1/orgs/:orgId/leads/:id
leads.delete("/:id", async (c) => {
  const user = c.get("user");
  const leadId = c.req.param("id");

  const lead = await leadsService.deleteLead(user.orgId, leadId);
  if (!lead) throw notFound("Lead not found");

  return c.json({ data: lead });
});

// POST /api/v1/orgs/:orgId/leads/:id/score
leads.post("/:id/score", requireRole("business_owner", "office_admin"), async (c) => {
  const user = c.get("user");
  const leadId = c.req.param("id") as string;

  const lead = await leadsService.getLead(user.orgId, leadId);
  if (!lead) throw notFound("Lead not found");

  const scorer = getLeadScorer();
  const result = await scorer.scoreLead(lead);
  await scorer.saveScore(leadId, result);

  return c.json({ data: result });
});

// POST /api/v1/orgs/:orgId/leads/score-all
leads.post("/score-all", requireRole("business_owner", "office_admin"), async (c) => {
  const user = c.get("user");

  const scorer = getLeadScorer();
  const scored = await scorer.batchScoreLeads(user.orgId);

  return c.json({ data: { scored } });
});

// GET /api/v1/orgs/:orgId/leads/:id/insights
leads.get("/:id/insights", async (c) => {
  const user = c.get("user");
  const leadId = c.req.param("id")!;

  const lead = await leadsService.getLead(user.orgId, leadId);
  if (!lead) throw notFound("Lead not found");

  const scorer = getLeadScorer();

  // If lead has no AI score yet, trigger scoring
  if (lead.aiScore === null || lead.aiScore === undefined) {
    const result = await scorer.scoreLead(lead);
    await scorer.saveScore(leadId, result);
    const classification = scorer.classifyFromResult(result);

    return c.json({
      data: {
        score: result.score,
        breakdown: result.breakdown,
        analysis: result.analysis,
        category: classification.category,
        suggestedActions: classification.suggestedActions,
      },
    });
  }

  // Use stored classification or recompute
  let category = lead.aiCategory as string;
  let suggestedActions = (lead.aiActions as string[]) ?? [];

  if (!category || suggestedActions.length === 0) {
    const classification = await scorer.classifyLead(lead);
    category = classification.category;
    suggestedActions = classification.suggestedActions;
  }

  return c.json({
    data: {
      score: lead.aiScore,
      breakdown: lead.aiScoreBreakdown,
      analysis: lead.aiAnalysis,
      category,
      suggestedActions,
    },
  });
});

// POST /api/v1/orgs/:orgId/leads/:id/activities
leads.post("/:id/activities", zValidator("json", addActivitySchema), async (c) => {
  const user = c.get("user");
  const leadId = c.req.param("id");
  const body = c.req.valid("json");

  // Verify lead exists
  const lead = await leadsService.getLead(user.orgId, leadId);
  if (!lead) throw notFound("Lead not found");

  const activity = await leadsService.addActivity({
    orgId: user.orgId,
    leadId,
    userId: user.id,
    activityType: body.activityType,
    description: body.description,
    metadata: body.metadata as Record<string, unknown> | undefined,
  });

  if (!activity) throw badRequest("Failed to add activity");

  return c.json({ data: activity }, 201);
});

export default leads;
