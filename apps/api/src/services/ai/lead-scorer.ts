// SitePilot AI — Lead Scoring & Qualification Service
// Evaluates leads on 5 dimensions (0-20 each = 0-100 total) using LLM.
// Also handles batch scoring, classification, and enrichment.

import { db, schema, eq, and, isNull } from "@sitepilot/db";
import { getDefaultLLMProvider, type LLMMessage } from "./llm.js";

// ---- Types ----

export interface ScoreBreakdown {
  urgency: number;       // 0-20: How quickly do they need the service?
  clarity: number;       // 0-20: How clearly do they describe what they need?
  budget: number;        // 0-20: Based on service type and property size
  completeness: number;  // 0-20: Has phone AND email? Missing info = deduction
  engagement: number;    // 0-20: Phone (higher intent) vs web form
}

export interface ScoringResult {
  score: number;
  breakdown: ScoreBreakdown;
  analysis: string;
}

export interface ClassificationResult {
  category: "emergency" | "high-value" | "standard" | "low-priority" | "info-request";
  suggestedActions: string[];
}

// Lead shape from schema (subset needed for scoring)
export interface ScorableLead {
  id: string;
  orgId: string;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  source: string;
  title?: string | null;
  description?: string | null;
  serviceType?: string | null;
  estimatedValue?: string | null;
  priority?: number | null;
  stage?: string | null;
}

// ---- LLM Prompt ----

function buildScoringPrompt(lead: ScorableLead): { system: string; user: string } {
  const system = `You are a lead scoring expert for a field service business (plumbing, HVAC, electrical, roofing, etc.).
Your job is to evaluate a lead on 5 dimensions, each scored 0-20, and provide a brief analysis.

Scoring guidelines:

1. **Urgency** (0-20): How quickly do they need service?
   - 18-20: Emergency ("ASAP", "flooding", "no heat", "leaking", "broken pipe", "tonight/today")
   - 13-17: Soon ("this week", "as soon as possible", "next few days")
   - 8-12: Planning ("next week", "getting quotes")
   - 0-7: Just browsing, no timeframe mentioned

2. **Service Clarity** (0-20): How clearly is the service need described?
   - 18-20: Specific problem, known service type, good detail
   - 13-17: Clear service type but lacking specifics
   - 8-12: General category mentioned (e.g., "plumbing work")
   - 0-7: Vague ("need help", "have a question")

3. **Budget Potential** (0-20): Based on service type and estimated value.
   - 18-20: High-ticket (roof replacement, HVAC install, full remodel) OR explicit high budget
   - 13-17: Moderate (water heater, electrical panel, major repair)
   - 8-12: Standard repair (faucet fix, minor electrical, small job)
   - 0-7: Very minor or no budget signal

4. **Contact Completeness** (0-20): Contact info provided.
   - 20: Has name + phone + email + address
   - 15: Has name + phone + email
   - 10: Has name + either phone OR email
   - 5: Has name only
   - 0: Anonymous/minimal contact

5. **Engagement** (0-20): How did they reach out?
   - 18-20: Phone call (highest intent)
   - 13-17: Website chat, WhatsApp
   - 8-12: Website form, email
   - 0-7: Passive (referral, walk-in without details)

Respond ONLY with a JSON object. No markdown, no explanation, just the JSON:
{
  "score": <0-100 integer>,
  "breakdown": {
    "urgency": <0-20>,
    "clarity": <0-20>,
    "budget": <0-20>,
    "completeness": <0-20>,
    "engagement": <0-20>
  },
  "analysis": "<2-3 sentence analysis explaining the score, what makes this lead strong or weak, and one actionable recommendation>"
}`;

  const contactInfo: string[] = [];
  if (lead.contactName) contactInfo.push(`Name: ${lead.contactName}`);
  if (lead.contactPhone) contactInfo.push(`Phone: ${lead.contactPhone}`);
  if (lead.contactEmail) contactInfo.push(`Email: ${lead.contactEmail}`);

  const user = `Evaluate this lead:

Contact: ${contactInfo.join(" | ") || "No contact info provided"}
Source: ${lead.source}
Service: ${lead.serviceType ?? "Not specified"}
Title: ${lead.title ?? "None"}
Description: ${lead.description ?? "None"}
Estimated Value: ${lead.estimatedValue ?? "Not specified"}
Priority (manual): ${lead.priority ?? 0}`;

  return { system, user };
}

// ---- LeadScorer Class ----

export class LeadScorer {
  /**
   * Scores a single lead using the LLM.
   * Returns structured scoring result.
   */
  async scoreLead(lead: ScorableLead): Promise<ScoringResult> {
    const provider = getDefaultLLMProvider();
    const { system, user } = buildScoringPrompt(lead);

    const messages: LLMMessage[] = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];

    const result = await provider.chat(messages, undefined, {
      temperature: 0.3, // Low temp for consistent scoring
      maxTokens: 512,
    });

    const content = result.message.content.trim();

    // Parse the JSON response, handling possible markdown code fences
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr);

      // Validate and clamp values
      const breakdown: ScoreBreakdown = {
        urgency: this.clamp(parsed.breakdown?.urgency ?? 10, 0, 20),
        clarity: this.clamp(parsed.breakdown?.clarity ?? 10, 0, 20),
        budget: this.clamp(parsed.breakdown?.budget ?? 10, 0, 20),
        completeness: this.clamp(parsed.breakdown?.completeness ?? 10, 0, 20),
        engagement: this.clamp(parsed.breakdown?.engagement ?? 10, 0, 20),
      };

      const score = this.clamp(
        parsed.score ?? Object.values(breakdown).reduce((a, b) => a + b, 0),
        0,
        100,
      );

      return {
        score,
        breakdown,
        analysis: parsed.analysis ?? "No analysis provided.",
      };
    } catch {
      // Fallback: compute a basic score without LLM
      return this.fallbackScore(lead);
    }
  }

  /**
   * Batch scores all unscored leads for an organization.
   * Returns count of leads scored.
   */
  async batchScoreLeads(orgId: string): Promise<number> {
    const unscoredLeads = await db
      .select({
        id: schema.leads.id,
        orgId: schema.leads.orgId,
        contactName: schema.leads.contactName,
        contactPhone: schema.leads.contactPhone,
        contactEmail: schema.leads.contactEmail,
        source: schema.leads.source,
        title: schema.leads.title,
        description: schema.leads.description,
        serviceType: schema.leads.serviceType,
        estimatedValue: schema.leads.estimatedValue,
        priority: schema.leads.priority,
      })
      .from(schema.leads)
      .where(
        and(
          eq(schema.leads.orgId, orgId),
          isNull(schema.leads.aiScore),
          isNull(schema.leads.deletedAt),
        ),
      );

    let scored = 0;
    for (const lead of unscoredLeads) {
      try {
        const result = await this.scoreLead(lead);

        // Also classify
        const classification = this.classifyFromResult(result);

        await db
          .update(schema.leads)
          .set({
            aiScore: result.score,
            aiScoreBreakdown: result.breakdown as unknown as Record<string, unknown>,
            aiAnalysis: result.analysis,
            aiCategory: classification.category,
            aiActions: classification.suggestedActions as unknown as string[],
            updatedAt: new Date(),
          })
          .where(eq(schema.leads.id, lead.id));

        scored++;
      } catch (err) {
        console.error(`Failed to score lead ${lead.id}:`, err);
      }
    }

    return scored;
  }

  /**
   * Classifies a lead into a category and suggests follow-up actions.
   */
  async classifyLead(lead: ScorableLead): Promise<ClassificationResult> {
    // If lead already has an AI score, use that; otherwise score first
    let scoringResult: ScoringResult;
    try {
      scoringResult = await this.scoreLead(lead);
    } catch {
      scoringResult = this.fallbackScore(lead);
    }

    return this.classifyFromResult(scoringResult);
  }

  /**
   * Attempts to enrich a lead with missing contact info.
   * Placeholder for future company lookup API integration.
   */
  async enrichLead(lead: ScorableLead): Promise<Partial<{ contactPhone: string; contactEmail: string }>> {
    const enrichment: Partial<{ contactPhone: string; contactEmail: string }> = {};

    // If company name exists but no phone/email, this is where we'd call
    // a company lookup API (e.g., Clearbit, Apollo) in the future.
    // For now, return empty — no enrichment possible without an API key.
    if (!lead.contactPhone && !lead.contactEmail) {
      // Placeholder: future enrichment via Clearbit/Apollo
    }

    return enrichment;
  }

  /**
   * Saves scoring results to the database for a lead.
   */
  async saveScore(leadId: string, result: ScoringResult): Promise<void> {
    const classification = this.classifyFromResult(result);

    await db
      .update(schema.leads)
      .set({
        aiScore: result.score,
        aiScoreBreakdown: result.breakdown as unknown as Record<string, unknown>,
        aiAnalysis: result.analysis,
        aiCategory: classification.category,
        aiActions: classification.suggestedActions as unknown as string[],
        updatedAt: new Date(),
      })
      .where(eq(schema.leads.id, leadId));
  }

  // ---- Helpers ----

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, Math.round(value)));
  }

  classifyFromResult(result: ScoringResult): ClassificationResult {
    const { score, breakdown } = result;

    // Determine category
    let category: ClassificationResult["category"] = "standard";
    if (breakdown.urgency >= 18) {
      category = "emergency";
    } else if (score >= 75 && breakdown.budget >= 15) {
      category = "high-value";
    } else if (score < 30) {
      category = "low-priority";
    } else if (breakdown.clarity <= 7 && breakdown.budget <= 7) {
      category = "info-request";
    }

    // Generate suggested actions
    const suggestedActions: string[] = [];

    if (category === "emergency") {
      suggestedActions.push("Call immediately — this is urgent");
      suggestedActions.push("Dispatch nearest available technician");
      suggestedActions.push("Prioritize over other leads in queue");
    } else if (category === "high-value") {
      suggestedActions.push("Schedule an on-site estimate within 24 hours");
      suggestedActions.push("Prepare a detailed quote with multiple options");
      suggestedActions.push("Assign to senior sales rep for follow-up");
    } else if (category === "low-priority") {
      suggestedActions.push("Send automated follow-up email in 3 days");
      suggestedActions.push("Add to nurture campaign");
      suggestedActions.push("Re-qualify if no response in 2 weeks");
    } else if (category === "info-request") {
      suggestedActions.push("Reply with service info and pricing guide");
      suggestedActions.push("Ask clarifying questions about their needs");
      suggestedActions.push("Set reminder to follow up in 5 days");
    } else {
      // standard
      suggestedActions.push("Follow up within 24 hours via phone");
      suggestedActions.push("Send estimate or service menu");
      suggestedActions.push("Schedule a call to qualify further");
    }

    // Add completeness-based actions
    if (breakdown.completeness < 15) {
      suggestedActions.push("Collect missing contact information");
    }

    return { category, suggestedActions: suggestedActions.slice(0, 4) };
  }

  /**
   * Fallback scoring without LLM — uses heuristics.
   */
  private fallbackScore(lead: ScorableLead): ScoringResult {
    // Urgency: based on keywords in title/description
    let urgency = 8;
    const text = `${lead.title ?? ""} ${lead.description ?? ""}`.toLowerCase();
    const urgentWords = ["asap", "emergency", "urgent", "flooding", "leaking", "no heat", "no power", "broken", "tonight", "immediately", "today"];
    const soonWords = ["this week", "soon", "as soon as", "next few days", "tomorrow"];
    if (urgentWords.some((w) => text.includes(w))) urgency = 19;
    else if (soonWords.some((w) => text.includes(w))) urgency = 15;
    else if (lead.priority && lead.priority >= 8) urgency = 17;

    // Clarity
    let clarity = 10;
    if (lead.serviceType && lead.description) clarity = 17;
    else if (lead.serviceType || (lead.title && lead.title.length > 20)) clarity = 14;
    else if (!lead.title && !lead.description) clarity = 5;

    // Budget: based on service type keywords
    let budget = 10;
    if (lead.estimatedValue) {
      const val = parseFloat(lead.estimatedValue);
      if (val > 5000) budget = 18;
      else if (val > 1000) budget = 14;
      else if (val > 200) budget = 10;
      else budget = 6;
    } else if (lead.serviceType) {
      const svc = lead.serviceType.toLowerCase();
      const highTicket = ["roof", "hvac install", "full remodel", "renovation", "solar", "generator"];
      const moderate = ["water heater", "panel", "heat pump", "ac install", "furnace"];
      if (highTicket.some((t) => svc.includes(t))) budget = 17;
      else if (moderate.some((t) => svc.includes(t))) budget = 14;
    }

    // Completeness
    let completeness = 5;
    if (lead.contactName) completeness += 5;
    if (lead.contactPhone) completeness += 5;
    if (lead.contactEmail) completeness += 5;
    completeness = Math.min(completeness, 20);

    // Engagement
    let engagement = 10;
    const source = lead.source.toLowerCase();
    if (source.includes("phone")) engagement = 19;
    else if (source.includes("chat") || source.includes("whatsapp")) engagement = 15;
    else if (source.includes("form") || source.includes("email")) engagement = 11;
    else engagement = 7;

    const score = urgency + clarity + budget + completeness + engagement;

    return {
      score: this.clamp(score, 0, 100),
      breakdown: { urgency, clarity, budget, completeness, engagement },
      analysis: `Lead scored using heuristic fallback (LLM unavailable). ` +
        `Strengths: ${urgency >= 15 ? "high urgency, " : ""}${clarity >= 15 ? "clear requirements, " : ""}${completeness >= 15 ? "complete contact info, " : ""}` +
        `Weaknesses: ${urgency < 10 ? "low urgency, " : ""}${clarity < 10 ? "vague requirements, " : ""}${completeness < 10 ? "incomplete contact, " : ""}`.replace(/, $/, ".") +
        ` Recommend ${score >= 60 ? "immediate" : "standard"} follow-up.`,
    };
  }
}

// ---- Convenience singleton ----
let defaultScorer: LeadScorer | null = null;

export function getLeadScorer(): LeadScorer {
  if (!defaultScorer) {
    defaultScorer = new LeadScorer();
  }
  return defaultScorer;
}
