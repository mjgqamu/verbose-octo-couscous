// SitePilot AI — Analytics Routes
// Protected endpoints for business owners: dashboard metrics, reports, AI analytics.
// Base path: /api/v1/orgs/:orgId/analytics

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth, orgContext, requireRole } from "../middleware/auth.js";
import { getAnalytics } from "../services/analytics.js";

const analytics = new Hono();

// All analytics routes require auth + business_owner role
analytics.use("*", requireAuth, orgContext, requireRole("business_owner"));

// ---- Query schema for date ranges ----
const dateRangeQuery = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  groupBy: z.enum(["day", "week", "month"]).optional().default("day"),
});

// ---- GET /api/v1/orgs/:orgId/analytics/dashboard ----
analytics.get("/dashboard", async (c) => {
  const user = c.get("user");
  const mgr = getAnalytics(user.orgId);
  const metrics = await mgr.getDashboardMetrics();
  return c.json({ data: metrics });
});

// ---- GET /api/v1/orgs/:orgId/analytics/leads ----
analytics.get("/leads", zValidator("query", dateRangeQuery), async (c) => {
  const user = c.get("user");
  const query = c.req.valid("query");
  const mgr = getAnalytics(user.orgId);

  const dateRange = query.dateFrom && query.dateTo
    ? { from: new Date(query.dateFrom), to: new Date(query.dateTo) }
    : undefined;

  const data = await mgr.getLeadAnalytics(dateRange);
  return c.json({ data });
});

// ---- GET /api/v1/orgs/:orgId/analytics/revenue ----
analytics.get("/revenue", zValidator("query", dateRangeQuery), async (c) => {
  const user = c.get("user");
  const query = c.req.valid("query");
  const mgr = getAnalytics(user.orgId);

  const dateRange = query.dateFrom && query.dateTo
    ? { from: new Date(query.dateFrom), to: new Date(query.dateTo) }
    : undefined;

  const data = await mgr.getRevenueAnalytics(dateRange);
  return c.json({ data });
});

// ---- GET /api/v1/orgs/:orgId/analytics/jobs ----
analytics.get("/jobs", zValidator("query", dateRangeQuery), async (c) => {
  const user = c.get("user");
  const query = c.req.valid("query");
  const mgr = getAnalytics(user.orgId);

  const dateRange = query.dateFrom && query.dateTo
    ? { from: new Date(query.dateFrom), to: new Date(query.dateTo) }
    : undefined;

  const data = await mgr.getJobAnalytics(dateRange);
  return c.json({ data });
});

// ---- GET /api/v1/orgs/:orgId/analytics/ai ----
analytics.get("/ai", async (c) => {
  const user = c.get("user");
  const mgr = getAnalytics(user.orgId);
  const data = await mgr.getAiAnalytics();
  return c.json({ data });
});

export default analytics;
