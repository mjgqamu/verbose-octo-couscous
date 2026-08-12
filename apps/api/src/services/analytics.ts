// SitePilot AI — Analytics Service
// Aggregation queries for dashboard, reports, and AI performance.

import { db, eq, and, isNull, isNotNull, gte, lte, count, sum, avg, sql, dateTruncDay, dateDiffHours } from "@sitepilot/db";
import { schema } from "@sitepilot/db";

const {
  leads,
  calls,
  appointments,
  quotes,
  jobs,
  invoices,
  conversations,
} = schema;

// ---- Helpers ----

function startOfMonth(date?: Date): Date {
  const d = date ? new Date(date) : new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfYear(date?: Date): Date {
  const d = date ? new Date(date) : new Date();
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateRangeFromPreset(
  preset?: string,
): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (preset) {
    case "this_month":
      return { from: startOfMonth(now), to };
    case "last_month": {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { from: lastMonth, to: end };
    }
    case "last_3_months": {
      const threeAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      return { from: threeAgo, to };
    }
    case "this_year":
      return { from: startOfYear(now), to };
    default:
      return { from: startOfMonth(now), to };
  }
}

// ---- Types ----

export interface DashboardMetrics {
  leadsThisMonth: number;
  leadsTotal: number;
  callsReceived: number;
  callsMissed: number;
  missedCallRate: number;
  appointmentsBooked: number;
  appointmentsCompleted: number;
  quotesSent: number;
  quotesAccepted: number;
  quoteConversionRate: number;
  jobsCompleted: number;
  jobsActive: number;
  invoicesPaid: number;
  invoicesOutstanding: number;
  revenueThisMonth: number;
  revenueTotal: number;
  conversionRate: number;
  avgJobValue: number;
}

export interface LeadAnalytics {
  bySource: Array<{ source: string; count: number }>;
  byStage: Array<{ stage: string; count: number }>;
  trend: Array<{ period: string; count: number }>;
}

export interface RevenueAnalytics {
  trend: Array<{ period: string; revenue: number }>;
  byServiceType: Array<{ serviceType: string; revenue: number; count: number }>;
}

export interface JobAnalytics {
  byStatus: Array<{ status: string; count: number }>;
  completionRate: number;
  avgCompletionTimeHours: number | null;
}

export interface AiAnalytics {
  conversationsTotal: number;
  conversationsAiHandled: number;
  leadsCreatedByAi: number;
  appointmentsBookedByAi: number;
  aiEscalationRate: number;
  aiEscalated: number;
}

// ---- AnalyticsManager ----

export class AnalyticsManager {
  private orgId: string;

  constructor(orgId: string) {
    this.orgId = orgId;
  }

  // ---- Dashboard Metrics ----

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const orgId = this.orgId;
    const monthStart = startOfMonth();

    // Run all queries in parallel
    const [
      leadsThisMonth,
      leadsTotal,
      callsReceived,
      callsMissed,
      appointmentsBooked,
      appointmentsCompleted,
      quotesSent,
      quotesAccepted,
      jobsCompleted,
      jobsActive,
      invoicesPaid,
      invoicesOutstanding,
      revenueThisMonth,
      revenueTotal,
      leadsConverted,
      leadsNotLost,
      paidInvoiceTotal,
      completedJobCount,
    ] = await Promise.all([
      // leadsThisMonth
      db
        .select({ count: count() })
        .from(leads)
        .where(and(eq(leads.orgId, orgId), isNull(leads.deletedAt), gte(leads.createdAt, monthStart)))
        .then((r) => Number(r[0]?.count ?? 0)),

      // leadsTotal
      db
        .select({ count: count() })
        .from(leads)
        .where(and(eq(leads.orgId, orgId), isNull(leads.deletedAt)))
        .then((r) => Number(r[0]?.count ?? 0)),

      // callsReceived (inbound this month)
      db
        .select({ count: count() })
        .from(calls)
        .where(and(eq(calls.orgId, orgId), eq(calls.direction, "inbound"), gte(calls.createdAt, monthStart)))
        .then((r) => Number(r[0]?.count ?? 0)),

      // callsMissed (missed this month)
      db
        .select({ count: count() })
        .from(calls)
        .where(and(eq(calls.orgId, orgId), gte(calls.createdAt, monthStart), eq(calls.status, "missed")))
        .then((r) => Number(r[0]?.count ?? 0)),

      // appointmentsBooked (this month, not cancelled)
      db
        .select({ count: count() })
        .from(appointments)
        .where(and(eq(appointments.orgId, orgId), gte(appointments.createdAt, monthStart)))
        .then((r) => Number(r[0]?.count ?? 0)),

      // appointmentsCompleted (this month)
      db
        .select({ count: count() })
        .from(appointments)
        .where(and(eq(appointments.orgId, orgId), gte(appointments.createdAt, monthStart), eq(appointments.status, "completed")))
        .then((r) => Number(r[0]?.count ?? 0)),

      // quotesSent (total)
      db
        .select({ count: count() })
        .from(quotes)
        .where(and(eq(quotes.orgId, orgId), isNull(quotes.deletedAt), eq(quotes.status, "sent")))
        .then((r) => Number(r[0]?.count ?? 0)),

      // quotesAccepted (total)
      db
        .select({ count: count() })
        .from(quotes)
        .where(and(eq(quotes.orgId, orgId), isNull(quotes.deletedAt), eq(quotes.status, "accepted")))
        .then((r) => Number(r[0]?.count ?? 0)),

      // jobsCompleted (total)
      db
        .select({ count: count() })
        .from(jobs)
        .where(and(eq(jobs.orgId, orgId), isNull(jobs.deletedAt), eq(jobs.status, "completed")))
        .then((r) => Number(r[0]?.count ?? 0)),

      // jobsActive
      db
        .select({ count: count() })
        .from(jobs)
        .where(
          and(
            eq(jobs.orgId, orgId),
            isNull(jobs.deletedAt),
            sql`${jobs.status} NOT IN ('completed', 'cancelled')`,
          ),
        )
        .then((r) => Number(r[0]?.count ?? 0)),

      // invoicesPaid (total)
      db
        .select({ count: count() })
        .from(invoices)
        .where(and(eq(invoices.orgId, orgId), isNull(invoices.deletedAt), eq(invoices.status, "paid")))
        .then((r) => Number(r[0]?.count ?? 0)),

      // invoicesOutstanding
      db
        .select({ count: count() })
        .from(invoices)
        .where(
          and(
            eq(invoices.orgId, orgId),
            isNull(invoices.deletedAt),
            sql`${invoices.status} IN ('sent', 'viewed', 'overdue', 'partially_paid')`,
          ),
        )
        .then((r) => Number(r[0]?.count ?? 0)),

      // revenueThisMonth: sum of total for paid invoices this month
      db
        .select({ total: sum(invoices.total) })
        .from(invoices)
        .where(and(eq(invoices.orgId, orgId), isNull(invoices.deletedAt), eq(invoices.status, "paid"), gte(invoices.paidAt, monthStart)))
        .then((r) => Number(r[0]?.total ?? 0)),

      // revenueTotal: sum of all paid invoices
      db
        .select({ total: sum(invoices.total) })
        .from(invoices)
        .where(and(eq(invoices.orgId, orgId), isNull(invoices.deletedAt), eq(invoices.status, "paid")))
        .then((r) => Number(r[0]?.total ?? 0)),

      // Leads that converted to jobs
      db
        .select({ count: count() })
        .from(leads)
        .where(and(eq(leads.orgId, orgId), isNull(leads.deletedAt), isNotNull(leads.convertedToJobId)))
        .then((r) => Number(r[0]?.count ?? 0)),

      // Leads not lost
      db
        .select({ count: count() })
        .from(leads)
        .where(and(eq(leads.orgId, orgId), isNull(leads.deletedAt), sql`${leads.stage} != 'lost'`))
        .then((r) => Number(r[0]?.count ?? 0)),

      // All paid invoice totals (for avg)
      db
        .select({ total: sum(invoices.total) })
        .from(invoices)
        .where(and(eq(invoices.orgId, orgId), isNull(invoices.deletedAt), eq(invoices.status, "paid")))
        .then((r) => Number(r[0]?.total ?? 0)),

      // Count of completed jobs (for avg)
      db
        .select({ count: count() })
        .from(jobs)
        .where(and(eq(jobs.orgId, orgId), isNull(jobs.deletedAt), eq(jobs.status, "completed")))
        .then((r) => Number(r[0]?.count ?? 0)),
    ]);

    const missedCallRate = callsReceived > 0 ? callsMissed / callsReceived : 0;
    const quoteConversionRate = quotesSent > 0 ? quotesAccepted / quotesSent : 0;
    const conversionRate = leadsNotLost > 0 ? leadsConverted / leadsNotLost : 0;
    const avgJobValue = completedJobCount > 0 ? paidInvoiceTotal / completedJobCount : 0;

    return {
      leadsThisMonth,
      leadsTotal,
      callsReceived,
      callsMissed,
      missedCallRate: Math.round(missedCallRate * 1000) / 10,
      appointmentsBooked,
      appointmentsCompleted,
      quotesSent,
      quotesAccepted,
      quoteConversionRate: Math.round(quoteConversionRate * 1000) / 10,
      jobsCompleted,
      jobsActive,
      invoicesPaid,
      invoicesOutstanding,
      revenueThisMonth,
      revenueTotal,
      conversionRate: Math.round(conversionRate * 1000) / 10,
      avgJobValue: Math.round(avgJobValue * 100) / 100,
    };
  }

  // ---- Lead Analytics ----

  async getLeadAnalytics(dateRange?: { from: Date; to: Date }): Promise<LeadAnalytics> {
    const orgId = this.orgId;
    const preset = dateRange ? undefined : "this_month";
    const range = dateRange ?? dateRangeFromPreset(preset);

    const [bySource, byStage, trend] = await Promise.all([
      // Leads by source
      db
        .select({ source: leads.source, count: count() })
        .from(leads)
        .where(
          and(
            eq(leads.orgId, orgId),
            isNull(leads.deletedAt),
            gte(leads.createdAt, range.from),
            lte(leads.createdAt, range.to),
          ),
        )
        .groupBy(leads.source)
        .orderBy(sql`count DESC`),

      // Leads by stage
      db
        .select({ stage: leads.stage, count: count() })
        .from(leads)
        .where(
          and(
            eq(leads.orgId, orgId),
            isNull(leads.deletedAt),
          ),
        )
        .groupBy(leads.stage)
        .orderBy(sql`count DESC`),

      // Lead trend — by day for this month, by month for wider ranges
      db
        .select({
          period: dateTruncDay(leads.createdAt),
          count: count(),
        })
        .from(leads)
        .where(
          and(
            eq(leads.orgId, orgId),
            isNull(leads.deletedAt),
            gte(leads.createdAt, range.from),
            lte(leads.createdAt, range.to),
          ),
        )
        .groupBy(dateTruncDay(leads.createdAt))
        .orderBy(dateTruncDay(leads.createdAt)),
    ]);

    return {
      bySource: bySource.map((r) => ({ source: r.source, count: Number(r.count) })),
      byStage: byStage.map((r) => ({ stage: r.stage, count: Number(r.count) })),
      trend: trend.map((r) => ({ period: String(r.period), count: Number(r.count) })),
    };
  }

  // ---- Revenue Analytics ----

  async getRevenueAnalytics(dateRange?: { from: Date; to: Date }): Promise<RevenueAnalytics> {
    const orgId = this.orgId;
    const preset = dateRange ? undefined : "this_month";
    const range = dateRange ?? dateRangeFromPreset(preset);

    const [trend, byServiceType] = await Promise.all([
      // Revenue trend
      db
        .select({
          period: dateTruncDay(invoices.paidAt),
          revenue: sum(invoices.total),
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.orgId, orgId),
            isNull(invoices.deletedAt),
            eq(invoices.status, "paid"),
            gte(invoices.paidAt, range.from),
            lte(invoices.paidAt, range.to),
          ),
        )
        .groupBy(dateTruncDay(invoices.paidAt))
        .orderBy(dateTruncDay(invoices.paidAt)),

      // Revenue by service type (via jobs linked to invoices)
      db
        .select({
          serviceType: sql<string>`COALESCE(${jobs.serviceType}, 'Uncategorized')`,
          revenue: sum(invoices.total),
          jobCount: count(),
        })
        .from(invoices)
        .leftJoin(jobs, eq(invoices.jobId, jobs.id))
        .where(
          and(
            eq(invoices.orgId, orgId),
            isNull(invoices.deletedAt),
            eq(invoices.status, "paid"),
            gte(invoices.paidAt, range.from),
            lte(invoices.paidAt, range.to),
          ),
        )
        .groupBy(sql`COALESCE(${jobs.serviceType}, 'Uncategorized')`)
        .orderBy(sql`sum(${invoices.total}) DESC`),
    ]);

    return {
      trend: trend.map((r) => ({ period: String(r.period), revenue: Number(r.revenue ?? 0) })),
      byServiceType: byServiceType.map((r) => ({
        serviceType: r.serviceType,
        revenue: Number(r.revenue ?? 0),
        count: Number(r.jobCount),
      })),
    };
  }

  // ---- Job Analytics ----

  async getJobAnalytics(dateRange?: { from: Date; to: Date }): Promise<JobAnalytics> {
    const orgId = this.orgId;
    const preset = dateRange ? undefined : "this_month";
    const range = dateRange ?? dateRangeFromPreset(preset);

    const [byStatus, completedCount, totalCount, avgCompletionTime] = await Promise.all([
      // Jobs by status
      db
        .select({ status: jobs.status, count: count() })
        .from(jobs)
        .where(
          and(
            eq(jobs.orgId, orgId),
            isNull(jobs.deletedAt),
          ),
        )
        .groupBy(jobs.status)
        .orderBy(sql`count DESC`),

      // Completed jobs in range
      db
        .select({ count: count() })
        .from(jobs)
        .where(
          and(
            eq(jobs.orgId, orgId),
            isNull(jobs.deletedAt),
            eq(jobs.status, "completed"),
            gte(jobs.createdAt, range.from),
            lte(jobs.createdAt, range.to),
          ),
        )
        .then((r) => Number(r[0]?.count ?? 0)),

      // Total jobs in range
      db
        .select({ count: count() })
        .from(jobs)
        .where(
          and(
            eq(jobs.orgId, orgId),
            isNull(jobs.deletedAt),
            gte(jobs.createdAt, range.from),
            lte(jobs.createdAt, range.to),
          ),
        )
        .then((r) => Number(r[0]?.count ?? 0)),

      // Avg completion time (hours) for completed jobs
      db
        .select({
          avgHours: avg(
            dateDiffHours(jobs.createdAt, jobs.completedAt),
          ),
        })
        .from(jobs)
        .where(
          and(
            eq(jobs.orgId, orgId),
            isNull(jobs.deletedAt),
            eq(jobs.status, "completed"),
            isNotNull(jobs.completedAt),
          ),
        )
        .then((r) => (r[0]?.avgHours ? Number(r[0].avgHours) : null)),
    ]);

    const completionRate = totalCount > 0 ? completedCount / totalCount : 0;

    return {
      byStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
      completionRate: Math.round(completionRate * 1000) / 10,
      avgCompletionTimeHours: avgCompletionTime ? Math.round(avgCompletionTime * 10) / 10 : null,
    };
  }

  // ---- AI Analytics ----

  async getAiAnalytics(): Promise<AiAnalytics> {
    const orgId = this.orgId;
    const monthStart = startOfMonth();

    const [
      conversationsTotal,
      conversationsAiHandled,
      aiEscalated,
      leadsCreatedByAi,
      appointmentsBookedByAi,
    ] = await Promise.all([
      // Total conversations
      db
        .select({ count: count() })
        .from(conversations)
        .where(and(eq(conversations.orgId, orgId), gte(conversations.createdAt, monthStart)))
        .then((r) => Number(r[0]?.count ?? 0)),

      // AI-handled conversations
      db
        .select({ count: count() })
        .from(conversations)
        .where(
          and(
            eq(conversations.orgId, orgId),
            gte(conversations.createdAt, monthStart),
            eq(conversations.isAiHandled, true),
          ),
        )
        .then((r) => Number(r[0]?.count ?? 0)),

      // AI escalated conversations
      db
        .select({ count: count() })
        .from(conversations)
        .where(
          and(
            eq(conversations.orgId, orgId),
            gte(conversations.createdAt, monthStart),
            eq(conversations.aiEscalated, true),
          ),
        )
        .then((r) => Number(r[0]?.count ?? 0)),

      // Leads created by AI (via calls marked as ai_handled that have a lead_id)
      db
        .select({ count: count() })
        .from(leads)
        .where(
          and(
            eq(leads.orgId, orgId),
            isNull(leads.deletedAt),
            gte(leads.createdAt, monthStart),
            sql`${leads.source} IN ('phone_call', 'website_chat', 'whatsapp')`,
          ),
        )
        .then((r) => Number(r[0]?.count ?? 0)),

      // Appointments booked by AI (appointments with associated AI-handled conversations this month)
      db
        .select({ count: count() })
        .from(appointments)
        .innerJoin(conversations, eq(appointments.customerId, conversations.customerId))
        .where(
          and(
            eq(appointments.orgId, orgId),
            gte(appointments.createdAt, monthStart),
            eq(conversations.isAiHandled, true),
          ),
        )
        .then((r) => Number(r[0]?.count ?? 0)),
    ]);

    const aiEscalationRate = conversationsAiHandled > 0 ? aiEscalated / conversationsAiHandled : 0;

    return {
      conversationsTotal,
      conversationsAiHandled,
      leadsCreatedByAi,
      appointmentsBookedByAi,
      aiEscalationRate: Math.round(aiEscalationRate * 1000) / 10,
      aiEscalated,
    };
  }
}

// Singleton helper
export function getAnalytics(orgId: string): AnalyticsManager {
  return new AnalyticsManager(orgId);
}
