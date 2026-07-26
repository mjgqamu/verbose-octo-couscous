// SitePilot AI — AI Business Analyst Routes
// Protected chat-based analytics assistant for business owners.
// Base path: /api/v1/orgs/:orgId/ai-analyst

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth, orgContext, requireRole } from "../middleware/auth.js";
import { getBusinessAnalyst } from "../services/ai/business-analyst.js";
import { badRequest } from "../lib/errors.js";

const aiAnalyst = new Hono();

// All routes require auth + business_owner role
aiAnalyst.use("*", requireAuth, orgContext, requireRole("business_owner"));

// ---- Schema ----

const askSchema = z.object({
  question: z.string().min(1, "Question is required").max(500, "Question must be 500 characters or less"),
});

// ---- POST /api/v1/orgs/:orgId/ai-analyst/ask ----

aiAnalyst.post("/ask", zValidator("json", askSchema), async (c) => {
  const user = c.get("user");
  const { question } = c.req.valid("json");

  const analyst = getBusinessAnalyst(user.orgId);

  try {
    const result = await analyst.analyze(question, user.orgId);
    return c.json({
      data: {
        answer: result.answer,
        dataUsed: result.dataUsed,
      },
    });
  } catch (err) {
    // If the LLM call fails, return an actionable error
    if (err instanceof Error) {
      throw badRequest(`Analysis failed: ${err.message}`);
    }
    throw err;
  }
});

export default aiAnalyst;
