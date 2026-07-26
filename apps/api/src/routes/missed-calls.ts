// SitePilot AI — Missed Calls API Routes
// POST /api/v1/orgs/:orgId/missed-calls/test — simulate a missed call
// GET  /api/v1/orgs/:orgId/missed-calls       — list recent missed calls

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth, orgContext } from "../middleware/auth.js";
import { missedCallHandler } from "../services/missed-calls.js";
import { db, schema, eq, and, desc, sql } from "@sitepilot/db";
import { forbidden, badRequest } from "../lib/errors.js";

const app = new Hono();

// All missed-calls routes require authentication
app.use("*", requireAuth, orgContext);

// ---- POST /api/v1/orgs/:orgId/missed-calls/test ----
const testMissedCallSchema = z.object({
  phoneNumber: z.string().min(1, "phoneNumber is required"),
});

app.post("/test", zValidator("json", testMissedCallSchema), async (c) => {
  const user = c.get("user");
  const orgId = c.req.param("orgId");

  if (user.orgId !== orgId) {
    throw forbidden("Access denied to this organization");
  }

  const { phoneNumber } = c.req.valid("json");

  try {
    const result = await missedCallHandler.handleMissedCall(orgId, phoneNumber);
    return c.json({ data: result }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process missed call";
    throw badRequest(message);
  }
});

// ---- GET /api/v1/orgs/:orgId/missed-calls ----
const listMissedCallsSchema = z.object({
  limit: z.string().optional().transform((v) => (v ? parseInt(v) : 20)),
  cursor: z.string().optional(),
});

app.get("/", zValidator("query", listMissedCallsSchema), async (c) => {
  const user = c.get("user");
  const orgId = c.req.param("orgId");

  if (user.orgId !== orgId) {
    throw forbidden("Access denied to this organization");
  }

  const query = c.req.valid("query");
  const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);

  const conditions = [
    eq(schema.calls.orgId, orgId),
    eq(schema.calls.status, "missed"),
  ];

  // Cursor-based pagination using createdAt
  if (query.cursor) {
    conditions.push(
      sql`${schema.calls.createdAt} < ${query.cursor}`,
    );
  }

  const rows = await db
    .select()
    .from(schema.calls)
    .where(and(...conditions))
    .orderBy(desc(schema.calls.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  if (hasMore) rows.pop();

  const lastRow = rows.length > 0 ? rows[rows.length - 1] : null;
  const nextCursor = hasMore && lastRow
    ? lastRow.createdAt?.toISOString() ?? null
    : null;

  return c.json({
    data: rows,
    pagination: {
      limit,
      nextCursor,
      hasMore,
    },
  });
});

export default app;
