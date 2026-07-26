import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import authRoutes from "./routes/auth.js";
import leadsRoutes from "./routes/leads.js";
import customersRoutes from "./routes/customers.js";
import conversationsRoutes from "./routes/conversations.js";
import aiRoutes from "./routes/ai.js";
import aiSettingsRoutes from "./routes/ai-settings.js";
import bookingsRoutes from "./routes/bookings.js";
import followUpsRoutes from "./routes/follow-ups.js";
import missedCallsRoutes from "./routes/missed-calls.js";
import jobsRoutes from "./routes/jobs.js";
import twilioWebhook from "./routes/webhooks/twilio.js";
import customerPortalRoutes from "./routes/customer-portal.js";
import invoicesRoutes from "./routes/invoices.js";
import analyticsRoutes from "./routes/analytics.js";
import aiAnalystRoutes from "./routes/ai-analyst.js";
import { errorHandler } from "./lib/errors.js";

const app = new Hono();

// ---- Global middleware ----
app.use("*", logger());

// CORS: allow credentials for httpOnly cookies
app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: [],
    maxAge: 600,
  }),
);

// ---- Error handling ----
app.onError(errorHandler);

// ---- Health check ----
app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ---- API v1 routes ----
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/orgs/:orgId/leads", leadsRoutes);
app.route("/api/v1/orgs/:orgId/customers", customersRoutes);
app.route("/api/v1/orgs/:orgId/conversations", conversationsRoutes);
app.route("/api/v1/orgs/:orgId/ai", aiRoutes);
app.route("/api/v1/orgs/:orgId/ai", aiSettingsRoutes);
app.route("/api/v1/orgs/:orgId", bookingsRoutes);
app.route("/api/v1/orgs/:orgId/follow-ups", followUpsRoutes);
app.route("/api/v1/orgs/:orgId/missed-calls", missedCallsRoutes);
app.route("/api/v1/orgs/:orgId/jobs", jobsRoutes);
app.route("/api/v1/webhooks/twilio", twilioWebhook);
app.route("/api/v1/orgs/:orgId/customer", customerPortalRoutes);
app.route("/api/v1/orgs/:orgId/invoices", invoicesRoutes);
app.route("/api/v1/orgs/:orgId/analytics", analyticsRoutes);
app.route("/api/v1/orgs/:orgId/ai-analyst", aiAnalystRoutes);

// 404 catch-all for API routes
app.all("/api/*", (c) => {
  return c.json(
    {
      error: {
        code: "NOT_FOUND",
        message: `Route ${c.req.method} ${c.req.path} not found`,
      },
    },
    404,
  );
});

// ---- Start server ----
const port = parseInt(process.env.PORT ?? "3001");

export default {
  port,
  fetch: app.fetch,
};

console.log(`🚀 SitePilot API server ready on port ${port}`);
