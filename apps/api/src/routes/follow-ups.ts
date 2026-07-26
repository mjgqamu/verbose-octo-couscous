// SitePilot AI — Follow-ups API Routes
// GET  /api/v1/orgs/:orgId/follow-ups         — list automation runs
// POST /api/v1/orgs/:orgId/follow-ups/trigger — manually trigger a follow-up

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { getFollowUpManager } from "../services/follow-ups.js";
import { forbidden } from "../lib/errors.js";

const app = new Hono();

// All routes require authentication
app.use("*", requireAuth);

// ---- GET /api/v1/orgs/:orgId/follow-ups ----
app.get("/", async (c) => {
  const user = c.get("user");
  const orgId = c.req.param("orgId");

  // Ensure user belongs to this org
  if (user.orgId !== orgId) {
    throw forbidden("Access denied to this organization");
  }

  const status = c.req.query("status") ?? undefined;
  const limit = parseInt(c.req.query("limit") ?? "20", 10);
  const offset = parseInt(c.req.query("offset") ?? "0", 10);

  const manager = getFollowUpManager();
  const result = await manager.listFollowUps(orgId, {
    status,
    limit,
    offset,
  });

  return c.json({
    data: result.data.map((run: any) => ({
      id: run.id,
      status: run.status,
      entityType: run.triggerEntityType,
      entityId: run.triggerEntityId,
      result: run.result,
      errorMessage: run.errorMessage,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      createdAt: run.createdAt,
    })),
    pagination: {
      limit,
      offset,
      total: result.total,
    },
  });
});

// ---- POST /api/v1/orgs/:orgId/follow-ups/trigger ----
const triggerSchema = z.object({
  entityType: z.enum(["quote", "appointment", "lead", "job"]),
  entityId: z.string().uuid(),
});

app.post("/trigger", zValidator("json", triggerSchema), async (c) => {
  const user = c.get("user");
  const orgId = c.req.param("orgId");

  if (user.orgId !== orgId) {
    throw forbidden("Access denied to this organization");
  }

  const { entityType, entityId } = c.req.valid("json");

  const manager = getFollowUpManager();
  const run = await manager.triggerNow(entityType, entityId, orgId);

  if (!run) {
    return c.json(
      {
        error: {
          code: "TRIGGER_FAILED",
          message: `Failed to trigger follow-up for ${entityType} ${entityId}`,
        },
      },
      500,
    );
  }

  return c.json({
    data: {
      id: run.runId,
      status: "triggered",
      entityType: run.entityType,
      entityId: run.entityId,
      followUpType: run.followUpType,
    },
  });
});

export default app;
