import { db, schema, eq, and, isNull, desc, asc, sql, count, gt, lt } from "@sitepilot/db";
import type { LeadStage } from "@sitepilot/shared";
import { getLeadScorer } from "./ai/lead-scorer.js";
import { getFollowUpManager } from "./follow-ups.js";

// ---- Types ----
export interface ListLeadsParams {
  orgId: string;
  stage?: string;
  source?: string;
  search?: string;
  assignedTo?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface CreateLeadParams {
  orgId: string;
  customerId?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  source?: string;
  sourceDetail?: string;
  stage?: string;
  priority?: number;
  title?: string;
  description?: string;
  serviceType?: string;
  estimatedValue?: string;
  assignedTo?: string;
  tags?: string[];
}

export interface UpdateLeadParams {
  stage?: string;
  priority?: number;
  title?: string;
  description?: string;
  serviceType?: string;
  estimatedValue?: string;
  assignedTo?: string | null;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  source?: string;
  sourceDetail?: string;
  lostReason?: string;
  tags?: string[];
  nextFollowUp?: string;
  dealSize?: string;
}

export interface AddActivityParams {
  orgId: string;
  leadId: string;
  userId: string;
  activityType: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

// ---- Lead CRUD ----
export async function listLeads(params: ListLeadsParams) {
  const {
    orgId,
    stage,
    source,
    search,
    assignedTo,
    dateFrom,
    dateTo,
    limit = 20,
    cursor,
    sortBy = "created_at",
    sortDir = "desc",
  } = params;

  const conditions = [
    eq(schema.leads.orgId, orgId),
    isNull(schema.leads.deletedAt),
  ];

  if (stage) conditions.push(eq(schema.leads.stage, stage));
  if (source) conditions.push(eq(schema.leads.source, source));
  if (assignedTo) conditions.push(eq(schema.leads.assignedTo, assignedTo));

  if (dateFrom) {
    conditions.push(gt(schema.leads.createdAt, new Date(dateFrom)));
  }
  if (dateTo) {
    conditions.push(lt(schema.leads.createdAt, new Date(dateTo)));
  }

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      sql`(${schema.leads.contactName} ILIKE ${pattern} OR ${schema.leads.contactPhone} ILIKE ${pattern} OR ${schema.leads.contactEmail} ILIKE ${pattern} OR ${schema.leads.title} ILIKE ${pattern})`
    );
  }

  if (cursor) {
    const col = sortBy === "created_at" ? schema.leads.createdAt : schema.leads.updatedAt;
    if (sortDir === "desc") {
      conditions.push(lt(col, new Date(cursor)));
    } else {
      conditions.push(gt(col, new Date(cursor)));
    }
  }

  const orderCol = sortBy === "created_at"
    ? schema.leads.createdAt
    : sortBy === "updated_at"
      ? schema.leads.updatedAt
      : sortBy === "priority"
        ? schema.leads.priority
        : schema.leads.createdAt;

  const orderFn = sortDir === "asc" ? asc : desc;

  const rows = await db
    .select({
      id: schema.leads.id,
      orgId: schema.leads.orgId,
      customerId: schema.leads.customerId,
      contactName: schema.leads.contactName,
      contactPhone: schema.leads.contactPhone,
      contactEmail: schema.leads.contactEmail,
      source: schema.leads.source,
      sourceDetail: schema.leads.sourceDetail,
      stage: schema.leads.stage,
      priority: schema.leads.priority,
      title: schema.leads.title,
      description: schema.leads.description,
      serviceType: schema.leads.serviceType,
      estimatedValue: schema.leads.estimatedValue,
      assignedTo: schema.leads.assignedTo,
      tags: schema.leads.tags,
      dealSize: schema.leads.dealSize,
      nextFollowUp: schema.leads.nextFollowUp,
      lostReason: schema.leads.lostReason,
      convertedToJobId: schema.leads.convertedToJobId,
      aiScore: schema.leads.aiScore,
      aiScoreBreakdown: schema.leads.aiScoreBreakdown,
      aiAnalysis: schema.leads.aiAnalysis,
      aiCategory: schema.leads.aiCategory,
      aiActions: schema.leads.aiActions,
      createdAt: schema.leads.createdAt,
      updatedAt: schema.leads.updatedAt,
      // Joined customer name
      customerFirstName: schema.customers.firstName,
      customerLastName: schema.customers.lastName,
      customerCompany: schema.customers.company,
    })
    .from(schema.leads)
    .leftJoin(schema.customers, eq(schema.leads.customerId, schema.customers.id))
    .where(and(...conditions))
    .orderBy(orderFn(orderCol))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = data[data.length - 1];

  // Get total count (for the current filter)
  const [totalRow] = await db
    .select({ total: count() })
    .from(schema.leads)
    .where(and(
      eq(schema.leads.orgId, orgId),
      isNull(schema.leads.deletedAt),
      ...(stage ? [eq(schema.leads.stage, stage)] : []),
      ...(source ? [eq(schema.leads.source, source)] : []),
      ...(assignedTo ? [eq(schema.leads.assignedTo, assignedTo)] : []),
    ));

  return {
    data: data.map((row) => ({
      ...row,
      customer: row.customerId
        ? {
            id: row.customerId,
            firstName: row.customerFirstName,
            lastName: row.customerLastName,
            company: row.customerCompany,
          }
        : null,
    })),
    pagination: {
      cursor: lastRow ? (sortBy === "created_at" ? lastRow.createdAt?.toISOString() : lastRow.updatedAt?.toISOString()) : null,
      hasMore,
      total: totalRow?.total ?? 0,
    },
  };
}

export async function getLead(orgId: string, leadId: string) {
  const [lead] = await db
    .select()
    .from(schema.leads)
    .where(and(eq(schema.leads.id, leadId), eq(schema.leads.orgId, orgId), isNull(schema.leads.deletedAt)))
    .limit(1);

  if (!lead) return null;

  // Load customer
  let customer = null;
  if (lead.customerId) {
    const [cust] = await db
      .select()
      .from(schema.customers)
      .where(and(eq(schema.customers.id, lead.customerId), eq(schema.customers.orgId, orgId)))
      .limit(1);
    customer = cust ?? null;
  }

  // Load activities
  const activities = await db
    .select()
    .from(schema.leadActivities)
    .where(and(eq(schema.leadActivities.leadId, leadId), eq(schema.leadActivities.orgId, orgId)))
    .orderBy(desc(schema.leadActivities.createdAt))
    .limit(50);

  // Load conversations
  const conversations = await db
    .select()
    .from(schema.conversations)
    .where(and(eq(schema.conversations.leadId, leadId), eq(schema.conversations.orgId, orgId)))
    .orderBy(desc(schema.conversations.lastMessageAt))
    .limit(20);

  // Load calls
  const calls = await db
    .select()
    .from(schema.calls)
    .where(and(eq(schema.calls.leadId, leadId), eq(schema.calls.orgId, orgId)))
    .orderBy(desc(schema.calls.startedAt))
    .limit(20);

  // Load assigned user
  let assignedUser = null;
  if (lead.assignedTo) {
    const [user] = await db
      .select({
        id: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
      })
      .from(schema.users)
      .where(eq(schema.users.id, lead.assignedTo))
      .limit(1);
    assignedUser = user ?? null;
  }

  return {
    ...lead,
    customer,
    activities,
    conversations,
    calls,
    assignedUser,
  };
}

export async function createLead(params: CreateLeadParams) {
  const [lead] = await db
    .insert(schema.leads)
    .values({
      orgId: params.orgId,
      customerId: params.customerId ?? null,
      contactName: params.contactName ?? null,
      contactPhone: params.contactPhone ?? null,
      contactEmail: params.contactEmail ?? null,
      source: params.source ?? "phone_call",
      sourceDetail: params.sourceDetail ?? null,
      stage: params.stage ?? "new",
      priority: params.priority ?? 0,
      title: params.title ?? null,
      description: params.description ?? null,
      serviceType: params.serviceType ?? null,
      estimatedValue: params.estimatedValue ?? null,
      assignedTo: params.assignedTo ?? null,
      tags: params.tags ?? [],
    })
    .returning();

  if (lead) {
    // Fire-and-forget: trigger AI scoring asynchronously
    const scorer = getLeadScorer();
    scorer.scoreLead(lead).then(async (result) => {
      try {
        await scorer.saveScore(lead.id, result);
      } catch (err) {
        console.error(`Auto-scoring failed for lead ${lead.id}:`, err);
      }
    }).catch((err) => {
      console.error(`Auto-scoring error for lead ${lead.id}:`, err);
    });
  }

  return lead ?? null;
}

export async function updateLead(orgId: string, leadId: string, params: UpdateLeadParams) {
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (params.stage !== undefined) updates.stage = params.stage;
  if (params.priority !== undefined) updates.priority = params.priority;
  if (params.title !== undefined) updates.title = params.title;
  if (params.description !== undefined) updates.description = params.description;
  if (params.serviceType !== undefined) updates.serviceType = params.serviceType;
  if (params.estimatedValue !== undefined) updates.estimatedValue = params.estimatedValue;
  if (params.assignedTo !== undefined) updates.assignedTo = params.assignedTo;
  if (params.contactName !== undefined) updates.contactName = params.contactName;
  if (params.contactPhone !== undefined) updates.contactPhone = params.contactPhone;
  if (params.contactEmail !== undefined) updates.contactEmail = params.contactEmail;
  if (params.source !== undefined) updates.source = params.source;
  if (params.sourceDetail !== undefined) updates.sourceDetail = params.sourceDetail;
  if (params.lostReason !== undefined) updates.lostReason = params.lostReason;
  if (params.tags !== undefined) updates.tags = params.tags;
  if (params.nextFollowUp !== undefined) updates.nextFollowUp = new Date(params.nextFollowUp);
  if (params.dealSize !== undefined) updates.dealSize = params.dealSize;

  const [lead] = await db
    .update(schema.leads)
    .set(updates)
    .where(and(eq(schema.leads.id, leadId), eq(schema.leads.orgId, orgId)))
    .returning();

  return lead ?? null;
}

export async function deleteLead(orgId: string, leadId: string) {
  const [lead] = await db
    .update(schema.leads)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.leads.id, leadId), eq(schema.leads.orgId, orgId)))
    .returning();

  return lead ?? null;
}

export async function addActivity(params: AddActivityParams) {
  const [activity] = await db
    .insert(schema.leadActivities)
    .values({
      orgId: params.orgId,
      leadId: params.leadId,
      userId: params.userId,
      activityType: params.activityType,
      description: params.description ?? null,
      metadata: params.metadata ?? {},
    })
    .returning();

  return activity ?? null;
}

export async function getPipeline(orgId: string) {
  const stages: LeadStage[] = ["new", "contacted", "qualified", "quote_sent", "approved", "job_scheduled", "completed", "lost"];

  const rows = await db
    .select({
      stage: schema.leads.stage,
      count: count(),
      totalValue: sql<string>`COALESCE(SUM(${schema.leads.estimatedValue}), '0')`,
    })
    .from(schema.leads)
    .where(and(eq(schema.leads.orgId, orgId), isNull(schema.leads.deletedAt)))
    .groupBy(schema.leads.stage);

  const byStage: Record<string, { count: number; totalValue: string }> = {};
  for (const stage of stages) {
    byStage[stage] = { count: 0, totalValue: "0" };
  }
  for (const row of rows) {
    if (row.stage) {
      byStage[row.stage] = {
        count: Number(row.count),
        totalValue: row.totalValue ?? "0",
      };
    }
  }

  return {
    stages: stages.map((stage) => ({
      stage,
      count: byStage[stage]?.count ?? 0,
      totalValue: byStage[stage]?.totalValue ?? "0",
    })),
  };
}

// ---- Follow-up hooks ----

/**
 * Call this after a quote is created to auto-schedule follow-ups.
 * Fire-and-forget — errors are logged but don't block the caller.
 */
export function scheduleQuoteFollowUps(quoteId: string, orgId: string): void {
  const manager = getFollowUpManager();
  manager.scheduleQuoteFollowUp(quoteId, orgId).catch((err) => {
    console.error(`[LeadsService] Failed to schedule quote follow-ups for ${quoteId}:`, err);
  });
}

/**
 * Call this after a lead is created/updated to schedule
 * inactive lead recovery if the lead goes quiet.
 */
export function scheduleInactiveLeadRecovery(leadId: string, orgId: string): void {
  const manager = getFollowUpManager();
  manager.scheduleInactiveLeadRecovery(leadId, orgId).catch((err) => {
    console.error(`[LeadsService] Failed to schedule inactive lead recovery for ${leadId}:`, err);
  });
}
