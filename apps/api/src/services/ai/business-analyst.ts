// SitePilot AI — Business Analyst Agent
// Chat-based analytics assistant that answers business questions using live dashboard data.

import { AnalyticsManager } from "../analytics.js";
import { getDefaultLLMProvider } from "./llm.js";
import type { LLMMessage } from "./llm.js";

// ---- Types ----

export interface AnalystResponse {
  answer: string;
  dataUsed: string[];
}

// ---- System Prompt ----

const SYSTEM_PROMPT = `You are a business analyst for a field service company. Answer questions about leads, revenue, jobs, appointments, and AI performance using the data provided below.

Rules:
- Be concise and actionable. Keep answers to 2-4 sentences unless the question requires more detail.
- If you detect a problem in the data (e.g., high missed call rate, low conversion, declining revenue), suggest specific solutions.
- Quote the exact numbers from the data when relevant.
- If the data doesn't contain enough information to fully answer the question, say so honestly and suggest what additional data would help.
- Never make up numbers. Only use what is provided.
- Format currency values as dollars with commas (e.g., $12,500).
- Format percentages with one decimal place (e.g., 23.4%).`;

// ---- BusinessAnalyst ----

export class BusinessAnalyst {
  private orgId: string;

  constructor(orgId: string) {
    this.orgId = orgId;
  }

  /**
   * Analyze a business question using live analytics data and an LLM.
   */
  async analyze(userQuestion: string, _orgId: string): Promise<AnalystResponse> {
    const analytics = new AnalyticsManager(this.orgId);

    // 1. Fetch all dashboard metrics in parallel
    const [dashboard, leadData, revenueData, jobData, aiData] = await Promise.all([
      analytics.getDashboardMetrics(),
      analytics.getLeadAnalytics(),
      analytics.getRevenueAnalytics(),
      analytics.getJobAnalytics(),
      analytics.getAiAnalytics(),
    ]);

    // 2. Build a structured data context string
    const dataContext = this.buildDataContext(dashboard, leadData, revenueData, jobData, aiData);

    // 3. Determine which data sections are most relevant (for tracking)
    const dataUsed = this.inferDataUsed(userQuestion);

    // 4. Send to LLM
    const llm = getDefaultLLMProvider();

    const messages: LLMMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Here is the current business data:\n\n${dataContext}\n\nUser question: ${userQuestion}` },
    ];

    const result = await llm.chat(messages, undefined, {
      temperature: 0.3,
      maxTokens: 600,
    });

    return {
      answer: result.message.content.trim(),
      dataUsed,
    };
  }

  /**
   * Build a structured data context string from all analytics.
   */
  private buildDataContext(
    dashboard: Awaited<ReturnType<AnalyticsManager["getDashboardMetrics"]>>,
    leadData: Awaited<ReturnType<AnalyticsManager["getLeadAnalytics"]>>,
    revenueData: Awaited<ReturnType<AnalyticsManager["getRevenueAnalytics"]>>,
    jobData: Awaited<ReturnType<AnalyticsManager["getJobAnalytics"]>>,
    aiData: Awaited<ReturnType<AnalyticsManager["getAiAnalytics"]>>,
  ): string {
    const lines: string[] = [];

    // Dashboard KPIs
    lines.push("=== DASHBOARD (This Month) ===");
    lines.push(`Leads this month: ${dashboard.leadsThisMonth}`);
    lines.push(`Total leads: ${dashboard.leadsTotal}`);
    lines.push(`Calls received: ${dashboard.callsReceived}`);
    lines.push(`Calls missed: ${dashboard.callsMissed}`);
    lines.push(`Missed call rate: ${dashboard.missedCallRate}%`);
    lines.push(`Appointments booked: ${dashboard.appointmentsBooked}`);
    lines.push(`Appointments completed: ${dashboard.appointmentsCompleted}`);
    lines.push(`Quotes sent: ${dashboard.quotesSent}`);
    lines.push(`Quotes accepted: ${dashboard.quotesAccepted}`);
    lines.push(`Quote conversion rate: ${dashboard.quoteConversionRate}%`);
    lines.push(`Jobs completed: ${dashboard.jobsCompleted}`);
    lines.push(`Active jobs: ${dashboard.jobsActive}`);
    lines.push(`Invoices paid: ${dashboard.invoicesPaid}`);
    lines.push(`Invoices outstanding: ${dashboard.invoicesOutstanding}`);
    lines.push(`Revenue this month: $${dashboard.revenueThisMonth.toLocaleString("en-US")}`);
    lines.push(`Total revenue (all time): $${dashboard.revenueTotal.toLocaleString("en-US")}`);
    lines.push(`Lead-to-job conversion rate: ${dashboard.conversionRate}%`);
    lines.push(`Average job value: $${dashboard.avgJobValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);

    // Lead Analytics
    lines.push("");
    lines.push("=== LEADS BY SOURCE ===");
    if (leadData.bySource.length > 0) {
      for (const s of leadData.bySource) {
        lines.push(`  ${s.source}: ${s.count}`);
      }
    } else {
      lines.push("  (no data)");
    }

    lines.push("");
    lines.push("=== LEADS BY STAGE ===");
    if (leadData.byStage.length > 0) {
      for (const s of leadData.byStage) {
        lines.push(`  ${s.stage}: ${s.count}`);
      }
    } else {
      lines.push("  (no data)");
    }

    // Revenue Analytics
    lines.push("");
    lines.push("=== REVENUE BY SERVICE TYPE ===");
    if (revenueData.byServiceType.length > 0) {
      for (const s of revenueData.byServiceType) {
        lines.push(`  ${s.serviceType}: $${s.revenue.toLocaleString("en-US")} (${s.count} jobs)`);
      }
    } else {
      lines.push("  (no data)");
    }

    // Job Analytics
    lines.push("");
    lines.push("=== JOBS ===");
    lines.push(`Completion rate: ${jobData.completionRate}%`);
    if (jobData.avgCompletionTimeHours !== null) {
      lines.push(`Avg completion time: ${jobData.avgCompletionTimeHours} hours`);
    }
    for (const s of jobData.byStatus) {
      lines.push(`  ${s.status}: ${s.count}`);
    }

    // AI Analytics
    lines.push("");
    lines.push("=== AI PERFORMANCE ===");
    lines.push(`Total conversations: ${aiData.conversationsTotal}`);
    lines.push(`AI-handled conversations: ${aiData.conversationsAiHandled}`);
    lines.push(`AI escalated: ${aiData.aiEscalated}`);
    lines.push(`AI escalation rate: ${aiData.aiEscalationRate}%`);
    lines.push(`Leads created by AI: ${aiData.leadsCreatedByAi}`);
    lines.push(`Appointments booked by AI: ${aiData.appointmentsBookedByAi}`);

    return lines.join("\n");
  }

  /**
   * Infer which data categories are relevant based on keyword matching in the question.
   */
  private inferDataUsed(question: string): string[] {
    const used: string[] = [];
    const q = question.toLowerCase();

    // Check for each category
    if (
      q.includes("lead") || q.includes("source") || q.includes("stage") ||
      q.includes("conversion") || q.includes("funnel") || q.includes("customer")
    ) {
      used.push("Leads");
    }

    if (
      q.includes("revenue") || q.includes("money") || q.includes("income") ||
      q.includes("earnings") || q.includes("service type") || q.includes("invoice") ||
      q.includes("sales") || q.includes("paid")
    ) {
      used.push("Revenue");
    }

    if (
      q.includes("call") || q.includes("phone") || q.includes("missed") ||
      q.includes("inbound")
    ) {
      used.push("Calls");
    }

    if (
      q.includes("job") || q.includes("completion") || q.includes("active") ||
      q.includes("work order") || q.includes("scheduled")
    ) {
      used.push("Jobs");
    }

    if (
      q.includes("appointment") || q.includes("booking") || q.includes("calendar")
    ) {
      used.push("Appointments");
    }

    if (
      q.includes("quote") || q.includes("estimate") || q.includes("proposal")
    ) {
      used.push("Quotes");
    }

    if (
      q.includes("ai") || q.includes("receptionist") || q.includes("bot") ||
      q.includes("automation") || q.includes("escalat") || q.includes("conversation")
    ) {
      used.push("AI Performance");
    }

    // Always include Dashboard metrics as they are always fetched
    if (used.length === 0) {
      used.push("Dashboard");
    } else if (!used.includes("Dashboard")) {
      used.push("Dashboard");
    }

    return used;
  }
}

// Factory helper
export function getBusinessAnalyst(orgId: string): BusinessAnalyst {
  return new BusinessAnalyst(orgId);
}
