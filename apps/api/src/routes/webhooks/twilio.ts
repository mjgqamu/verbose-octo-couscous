// SitePilot AI — Twilio Voice Webhook
// POST /api/v1/webhooks/twilio/voice — Twilio status callback endpoint
//
// TODO: Implement Twilio signature verification to validate requests are from Twilio.
//       See https://www.twilio.com/docs/usage/security#validating-requests

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { missedCallHandler } from "../../services/missed-calls.js";

const app = new Hono();

// No auth middleware — this is a public webhook from Twilio

const twilioVoiceSchema = z.object({
  CallStatus: z.string().optional(),
  From: z.string().optional(),
  To: z.string().optional(),
  CallSid: z.string().optional(),
});

app.post("/voice", zValidator("json", twilioVoiceSchema), async (c) => {
  const body = c.req.valid("json");
  const { CallStatus, From, To, CallSid } = body;

  console.log("[twilio webhook] voice status:", { CallStatus, From, To, CallSid });

  // Handle missed/busy/failed calls
  if (CallStatus === "no-answer" || CallStatus === "busy" || CallStatus === "failed") {
    if (From) {
      // TODO: Map `To` phone number to an orgId via a phone-number-to-org lookup.
      //       Currently using a placeholder orgId.
      const orgId = "00000000-0000-0000-0000-000000000000";

      try {
        const result = await missedCallHandler.handleMissedCall(orgId, From);
        console.log("[twilio webhook] missed call handled:", result);
      } catch (err) {
        console.error("[twilio webhook] failed to handle missed call:", err);
        // Still return 200 so Twilio doesn't retry
      }
    }
  }

  // Always return 200 — Twilio will retry on non-2xx
  return c.json({}, 200);
});

export default app;
