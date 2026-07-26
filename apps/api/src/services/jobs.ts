import { db, schema, eq, and, isNull, desc, asc, sql, count, gt, gte, lt, inArray } from "@sitepilot/db";
import type { JobStatus } from "@sitepilot/shared";

// ---- Valid status transitions ----
const VALID_TRANSITIONS: Record<string, string[]> = {
  new: ["scheduled", "cancelled"],
  scheduled: ["assigned", "cancelled"],
  assigned: ["in_progress", "cancelled"],
  in_progress: ["waiting_on_parts", "waiting_on_customer", "completed", "cancelled"],
  waiting_on_parts: ["in_progress", "cancelled"],
  waiting_on_customer: ["in_progress", "cancelled"],
  completed: [] as string[],
  cancelled: [] as string[],
};

// All "waiting" variants
const WAITING_STATUSES: JobStatus[] = ["waiting_on_parts", "waiting_on_customer"];

// ---- Types ----
export interface ListJobsParams {
  orgId: string;
  status?: string;
  technicianId?: string;
  customerId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface CreateJobParams {
  customerId: string;
  leadId?: string;
  quoteId?: string;
  title: string;
  description?: string;
  serviceType?: string;
  priority?: number;
  scheduledStart?: string;
  scheduledEnd?: string;
  technicianId?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  notes?: string;
  tags?: string[];
}

export interface UpdateJobParams {
  title?: string;
  description?: string;
  status?: string;
  priority?: number;
  serviceType?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  technicianId?: string | null;
  notes?: string;
  internalNotes?: string;
  tags?: string[];
  cancelReason?: string;
}

export interface AddJobActivityParams {
  orgId: string;
  jobId: string;
  userId: string;
  activityType: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface AddJobPhotoParams {
  orgId: string;
  jobId: string;
  userId: string;
  url: string;
  caption?: string;
  photoType?: "before" | "after" | "progress";
}

// ---- Helpers ----

function generateJobNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `JOB-${date}-${rand}`;
}

function isValidTransition(current: string, next: string): boolean {
  const allowed = VALID_TRANSITIONS[current];
  return allowed ? allowed.includes(next) : false;
}

/**
 * Merge waiting_on_parts + waiting_on_customer into "waiting" for UI.
 */
function normalizeWaitingStatus(status: string): string {
  return WAITING_STATUSES.includes(status as JobStatus) ? "waiting" : status;
}

// ---- JobManager ----

export class JobManager {
  // ---- CREATE ----
  async createJob(orgId: string, data: CreateJobParams) {
    const number = generateJobNumber();

    const [job] = await db
      .insert(schema.jobs)
      .values({
        orgId,
        number,
        customerId: data.customerId,
        leadId: data.leadId ?? null,
        quoteId: data.quoteId ?? null,
        title: data.title,
        description: data.description ?? null,
        status: "new",
        priority: data.priority ?? 0,
        serviceType: data.serviceType ?? null,
        scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : null,
        scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : null,
        assignedTechs: data.technicianId ? [data.technicianId] : [],
        addressLine1: data.addressLine1 ?? null,
        addressLine2: data.addressLine2 ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        postalCode: data.postalCode ?? null,
        notes: data.notes ?? null,
        tags: data.tags ?? [],
      })
      .returning();

    return job ?? null;
  }

  // ---- LIST ----
  async getJobs(orgId: string, filters: ListJobsParams) {
    const {
      status,
      technicianId,
      customerId,
      search,
      dateFrom,
      dateTo,
      limit = 20,
      cursor,
      sortBy = "created_at",
      sortDir = "desc",
    } = filters;

    const conditions = [
      eq(schema.jobs.orgId, orgId),
      isNull(schema.jobs.deletedAt),
    ];

    if (status) {
      if (status === "waiting") {
        conditions.push(inArray(schema.jobs.status, WAITING_STATUSES as any));
      } else {
        conditions.push(eq(schema.jobs.status, status));
      }
    }

    if (technicianId) {
      // assignedTechs is an array; check if it contains the tech
      conditions.push(sql`${technicianId} = ANY(${schema.jobs.assignedTechs})`);
    }

    if (customerId) {
      conditions.push(eq(schema.jobs.customerId, customerId));
    }

    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        sql`(${schema.jobs.title} ILIKE ${pattern} OR ${schema.jobs.number} ILIKE ${pattern} OR ${schema.jobs.description} ILIKE ${pattern})`
      );
    }

    if (dateFrom) {
      conditions.push(gt(schema.jobs.scheduledStart, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lt(schema.jobs.scheduledStart, new Date(dateTo)));
    }

    // Cursor pagination
    if (cursor) {
      const col = sortBy === "created_at" ? schema.jobs.createdAt : schema.jobs.updatedAt;
      if (sortDir === "desc") {
        conditions.push(lt(col, new Date(cursor)));
      } else {
        conditions.push(gt(col, new Date(cursor)));
      }
    }

    const orderCol = sortBy === "created_at"
      ? schema.jobs.createdAt
      : sortBy === "updated_at"
        ? schema.jobs.updatedAt
        : sortBy === "priority"
          ? schema.jobs.priority
          : sortBy === "scheduled_start"
            ? schema.jobs.scheduledStart
            : schema.jobs.createdAt;

    const orderFn = sortDir === "asc" ? asc : desc;

    const rows = await db
      .select({
        id: schema.jobs.id,
        orgId: schema.jobs.orgId,
        number: schema.jobs.number,
        customerId: schema.jobs.customerId,
        leadId: schema.jobs.leadId,
        quoteId: schema.jobs.quoteId,
        title: schema.jobs.title,
        description: schema.jobs.description,
        status: schema.jobs.status,
        priority: schema.jobs.priority,
        serviceType: schema.jobs.serviceType,
        scheduledStart: schema.jobs.scheduledStart,
        scheduledEnd: schema.jobs.scheduledEnd,
        actualStart: schema.jobs.actualStart,
        actualEnd: schema.jobs.actualEnd,
        assignedTechs: schema.jobs.assignedTechs,
        estimatedHours: schema.jobs.estimatedHours,
        actualHours: schema.jobs.actualHours,
        notes: schema.jobs.notes,
        tags: schema.jobs.tags,
        completedAt: schema.jobs.completedAt,
        cancelledAt: schema.jobs.cancelledAt,
        createdAt: schema.jobs.createdAt,
        updatedAt: schema.jobs.updatedAt,
        // Customer join
        customerFirstName: schema.customers.firstName,
        customerLastName: schema.customers.lastName,
        customerCompany: schema.customers.company,
      })
      .from(schema.jobs)
      .leftJoin(schema.customers, eq(schema.jobs.customerId, schema.customers.id))
      .where(and(...conditions))
      .orderBy(orderFn(orderCol))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const lastRow = data[data.length - 1];

    // Total count
    const countConditions = [
      eq(schema.jobs.orgId, orgId),
      isNull(schema.jobs.deletedAt),
    ];
    if (status) {
      if (status === "waiting") {
        countConditions.push(inArray(schema.jobs.status, WAITING_STATUSES as any));
      } else {
        countConditions.push(eq(schema.jobs.status, status));
      }
    }
    if (technicianId) {
      countConditions.push(sql`${technicianId} = ANY(${schema.jobs.assignedTechs})`);
    }

    const [totalRow] = await db
      .select({ total: count() })
      .from(schema.jobs)
      .where(and(...countConditions));

    return {
      data: data.map((row) => ({
        ...row,
        // Normalize status for waiting variants in the response
        status: row.status ? normalizeWaitingStatus(row.status) : row.status,
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

  // ---- GET SINGLE ----
  async getJob(orgId: string, jobId: string) {
    const [job] = await db
      .select()
      .from(schema.jobs)
      .where(and(eq(schema.jobs.id, jobId), eq(schema.jobs.orgId, orgId), isNull(schema.jobs.deletedAt)))
      .limit(1);

    if (!job) return null;

    // Customer
    let customer = null;
    if (job.customerId) {
      const [cust] = await db
        .select()
        .from(schema.customers)
        .where(and(eq(schema.customers.id, job.customerId), eq(schema.customers.orgId, orgId)))
        .limit(1);
      customer = cust ?? null;
    }

    // Technicians (from assignedTechs array)
    let technicians: Array<{ id: string; firstName: string; lastName: string; email: string }> = [];
    if (job.assignedTechs && job.assignedTechs.length > 0) {
      technicians = await db
        .select({
          id: schema.users.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          email: schema.users.email,
        })
        .from(schema.users)
        .where(inArray(schema.users.id, job.assignedTechs as any));
    }

    // Activities
    const activities = await db
      .select()
      .from(schema.jobActivities)
      .where(and(eq(schema.jobActivities.jobId, jobId), eq(schema.jobActivities.orgId, orgId)))
      .orderBy(desc(schema.jobActivities.createdAt))
      .limit(50);

    // Photos
    const photos = await db
      .select()
      .from(schema.jobPhotos)
      .where(and(eq(schema.jobPhotos.jobId, jobId), eq(schema.jobPhotos.orgId, orgId)))
      .orderBy(desc(schema.jobPhotos.createdAt));

    // Lead (if linked)
    let lead = null;
    if (job.leadId) {
      const [ld] = await db
        .select({
          id: schema.leads.id,
          contactName: schema.leads.contactName,
          contactPhone: schema.leads.contactPhone,
          stage: schema.leads.stage,
          title: schema.leads.title,
        })
        .from(schema.leads)
        .where(eq(schema.leads.id, job.leadId))
        .limit(1);
      lead = ld ?? null;
    }

    return {
      ...job,
      status: normalizeWaitingStatus(job.status ?? ""),
      customer,
      technicians,
      activities,
      photos,
      lead,
    };
  }

  // ---- UPDATE ----
  async updateJob(orgId: string, jobId: string, data: UpdateJobParams) {
    const existing = await this.getJob(orgId, jobId);
    if (!existing) return null;

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.priority !== undefined) updates.priority = data.priority;
    if (data.serviceType !== undefined) updates.serviceType = data.serviceType;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.internalNotes !== undefined) updates.internalNotes = data.internalNotes;
    if (data.tags !== undefined) updates.tags = data.tags;
    if (data.scheduledStart !== undefined) updates.scheduledStart = new Date(data.scheduledStart);
    if (data.scheduledEnd !== undefined) updates.scheduledEnd = new Date(data.scheduledEnd);

    // Technician assignment
    if (data.technicianId !== undefined) {
      updates.assignedTechs = data.technicianId ? [data.technicianId] : [];
    }

    // Status transition with validation
    if (data.status !== undefined && data.status !== existing.status) {
      // Map "waiting" to the first waiting status if needed
      let targetStatus = data.status;
      if (data.status === "waiting") targetStatus = "waiting_on_parts";

      if (!isValidTransition(existing.status, targetStatus)) {
        throw new Error(`Invalid status transition: ${existing.status} → ${data.status}`);
      }

      updates.status = targetStatus;

      // Auto-set timestamps for terminal states
      if (targetStatus === "completed") {
        updates.completedAt = new Date();
        updates.actualEnd = new Date();
      }
      if (targetStatus === "cancelled") {
        updates.cancelledAt = new Date();
        if (data.cancelReason) updates.cancelReason = data.cancelReason;
      }
      if (targetStatus === "in_progress" && !existing.actualStart) {
        updates.actualStart = new Date();
      }
    }

    const [job] = await db
      .update(schema.jobs)
      .set(updates)
      .where(and(eq(schema.jobs.id, jobId), eq(schema.jobs.orgId, orgId)))
      .returning();

    return job ?? null;
  }

  // ---- ASSIGN TECHNICIAN ----
  async assignTechnician(orgId: string, jobId: string, technicianId: string) {
    const [job] = await db
      .update(schema.jobs)
      .set({
        assignedTechs: [technicianId],
        updatedAt: new Date(),
        ...(/* auto-transition to 'assigned' if currently 'scheduled' */ {}),
      })
      .where(and(eq(schema.jobs.id, jobId), eq(schema.jobs.orgId, orgId)))
      .returning();

    return job ?? null;
  }

  // ---- ADD ACTIVITY ----
  async addJobActivity(orgId: string, jobId: string, data: {
    userId: string;
    activityType: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }) {
    const [activity] = await db
      .insert(schema.jobActivities)
      .values({
        orgId,
        jobId,
        userId: data.userId,
        activityType: data.activityType,
        description: data.description ?? null,
        metadata: data.metadata ?? {},
      })
      .returning();

    return activity ?? null;
  }

  // ---- ADD PHOTO ----
  async addJobPhoto(orgId: string, jobId: string, data: {
    userId: string;
    url: string;
    caption?: string;
    photoType?: "before" | "after" | "progress";
  }) {
    // Store photoType in caption as structured prefix if not explicit caption
    const caption = data.caption ?? (data.photoType ? `${data.photoType} photo` : null);

    const [photo] = await db
      .insert(schema.jobPhotos)
      .values({
        orgId,
        jobId,
        userId: data.userId,
        url: data.url,
        caption,
        takenAt: new Date(),
      })
      .returning();

    return photo ?? null;
  }

  // ---- GET STATS ----
  async getJobStats(orgId: string) {
    // Counts by status
    const rows = await db
      .select({
        status: schema.jobs.status,
        count: count(),
      })
      .from(schema.jobs)
      .where(and(eq(schema.jobs.orgId, orgId), isNull(schema.jobs.deletedAt)))
      .groupBy(schema.jobs.status);

    const byStatus: Record<string, number> = {};
    for (const row of rows) {
      if (row.status) {
        const normalized = normalizeWaitingStatus(row.status);
        byStatus[normalized] = (byStatus[normalized] ?? 0) + Number(row.count);
      }
    }

    // Today's jobs (scheduled for today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayRow] = await db
      .select({ total: count() })
      .from(schema.jobs)
      .where(and(
        eq(schema.jobs.orgId, orgId),
        isNull(schema.jobs.deletedAt),
        gte(schema.jobs.scheduledStart, today),
        lt(schema.jobs.scheduledStart, tomorrow),
      ));

    // Completed today
    const [completedTodayRow] = await db
      .select({ total: count() })
      .from(schema.jobs)
      .where(and(
        eq(schema.jobs.orgId, orgId),
        isNull(schema.jobs.deletedAt),
        eq(schema.jobs.status, "completed"),
        gte(schema.jobs.completedAt, today),
        lt(schema.jobs.completedAt, tomorrow),
      ));

    // Active jobs (not completed, not cancelled)
    const [activeRow] = await db
      .select({ total: count() })
      .from(schema.jobs)
      .where(and(
        eq(schema.jobs.orgId, orgId),
        isNull(schema.jobs.deletedAt),
        sql`${schema.jobs.status} NOT IN ('completed', 'cancelled')`,
      ));

    // Completion rate (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [completed30Row] = await db
      .select({ total: count() })
      .from(schema.jobs)
      .where(and(
        eq(schema.jobs.orgId, orgId),
        isNull(schema.jobs.deletedAt),
        eq(schema.jobs.status, "completed"),
        gte(schema.jobs.completedAt, thirtyDaysAgo),
      ));

    const [total30Row] = await db
      .select({ total: count() })
      .from(schema.jobs)
      .where(and(
        eq(schema.jobs.orgId, orgId),
        isNull(schema.jobs.deletedAt),
        gte(schema.jobs.createdAt, thirtyDaysAgo),
      ));

    const completionRate = total30Row && total30Row.total > 0
      ? Math.round((Number(completed30Row?.total ?? 0) / Number(total30Row.total)) * 100)
      : 0;

    return {
      byStatus,
      activeJobs: Number(activeRow?.total ?? 0),
      todayJobs: Number(todayRow?.total ?? 0),
      completedToday: Number(completedTodayRow?.total ?? 0),
      completionRate,
    };
  }

  // ---- Get technician's jobs for today ----
  async getTechnicianTodayJobs(orgId: string, technicianId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const rows = await db
      .select({ id: schema.jobs.id, status: schema.jobs.status })
      .from(schema.jobs)
      .where(and(
        eq(schema.jobs.orgId, orgId),
        isNull(schema.jobs.deletedAt),
        sql`${technicianId} = ANY(${schema.jobs.assignedTechs})`,
        gte(schema.jobs.scheduledStart, today),
        lt(schema.jobs.scheduledStart, tomorrow),
      ));

    const jobsToday = rows.length;
    const completed = rows.filter((r) => r.status === "completed").length;

    return { jobsToday, completed };
  }
}

// Singleton instance
let _jobManager: JobManager | null = null;

export function getJobManager(): JobManager {
  if (!_jobManager) {
    _jobManager = new JobManager();
  }
  return _jobManager;
}
