// SitePilot AI — Follow-Up Manager
// In-memory scheduler using setTimeout for follow-up messages, appointment reminders,
// inactive lead recovery, and review requests.

import { db, schema, eq, and, desc, count } from "@sitepilot/db";

// ---- Types ----

interface ScheduledJob {
  timeoutId: ReturnType<typeof setTimeout>;
  entityType: string;
  entityId: string;
  orgId: string;
  runId: string;
  scheduledFor: Date;
}

interface FollowUpRun {
  automationId: string;
  runId: string;
  entityType: string;
  entityId: string;
  orgId: string;
  followUpType: string;
  scheduledFor: Date;
  status: string;
}

type FollowUpType =
  | "quote_follow_up_2d"
  | "quote_follow_up_5d"
  | "quote_follow_up_10d"
  | "appointment_reminder_24h"
  | "appointment_reminder_1h"
  | "inactive_lead_recovery_14d"
  | "review_request_3d";

// ---- FollowUpManager ----

export class FollowUpManager {
  private jobs: Map<string, ScheduledJob> = new Map();

  /**
   * Generates a unique job key from entity type + id + follow-up type.
   */
  private jobKey(entityType: string, entityId: string, followUpType: string): string {
    return `${entityType}:${entityId}:${followUpType}`;
  }

  /**
   * Schedules 3 follow-ups after a quote is created:
   * - 2 days: gentle check-in
   * - 5 days: value reminder
   * - 10 days: final nudge
   */
  async scheduleQuoteFollowUp(quoteId: string, orgId: string): Promise<void> {
    const delays = [
      { days: 2, type: "quote_follow_up_2d" as const },
      { days: 5, type: "quote_follow_up_5d" as const },
      { days: 10, type: "quote_follow_up_10d" as const },
    ];

    for (const { days, type } of delays) {
      const delayMs = days * 24 * 60 * 60 * 1000;
      await this.scheduleJob("quote", quoteId, orgId, type, delayMs);
    }

    console.log(`[FollowUpManager] Scheduled 3 quote follow-ups for quote ${quoteId}`);
  }

  /**
   * Schedules appointment reminders: 24h before and 1h before.
   */
  async scheduleAppointmentReminder(appointmentId: string, orgId: string): Promise<void> {
    // Load appointment to get scheduled start time
    const [appointment] = await db
      .select({ scheduledStart: schema.appointments.scheduledStart })
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.id, appointmentId),
          eq(schema.appointments.orgId, orgId),
        ),
      )
      .limit(1);

    if (!appointment?.scheduledStart) {
      console.warn(`[FollowUpManager] Appointment ${appointmentId} has no scheduled start, skipping reminders`);
      return;
    }

    const now = Date.now();
    const scheduledTime = new Date(appointment.scheduledStart).getTime();

    // 24h before
    const reminder24hDelay = scheduledTime - now - 24 * 60 * 60 * 1000;
    if (reminder24hDelay > 0) {
      await this.scheduleJob(
        "appointment",
        appointmentId,
        orgId,
        "appointment_reminder_24h",
        reminder24hDelay,
      );
    }

    // 1h before
    const reminder1hDelay = scheduledTime - now - 60 * 60 * 1000;
    if (reminder1hDelay > 0) {
      await this.scheduleJob(
        "appointment",
        appointmentId,
        orgId,
        "appointment_reminder_1h",
        reminder1hDelay,
      );
    }

    console.log(`[FollowUpManager] Scheduled appointment reminders for ${appointmentId}`);
  }

  /**
   * Schedules an inactive lead recovery check at 14 days.
   */
  async scheduleInactiveLeadRecovery(leadId: string, orgId: string): Promise<void> {
    const delayMs = 14 * 24 * 60 * 60 * 1000;
    await this.scheduleJob("lead", leadId, orgId, "inactive_lead_recovery_14d", delayMs);
    console.log(`[FollowUpManager] Scheduled inactive lead recovery for lead ${leadId}`);
  }

  /**
   * Schedules a review request 3 days after job completion.
   */
  async scheduleReviewRequest(jobId: string, orgId: string): Promise<void> {
    const delayMs = 3 * 24 * 60 * 60 * 1000;
    await this.scheduleJob("job", jobId, orgId, "review_request_3d", delayMs);
    console.log(`[FollowUpManager] Scheduled review request for job ${jobId}`);
  }

  /**
   * Removes all pending follow-up jobs for a given entity.
   */
  cancelFollowUps(entityType: string, entityId: string): void {
    let cancelled = 0;
    for (const [key, job] of this.jobs.entries()) {
      if (job.entityType === entityType && job.entityId === entityId) {
        clearTimeout(job.timeoutId);
        this.jobs.delete(key);
        cancelled++;
      }
    }
    if (cancelled > 0) {
      console.log(`[FollowUpManager] Cancelled ${cancelled} follow-ups for ${entityType} ${entityId}`);
    }
  }

  /**
   * Schedules a single job with a given delay.
   */
  private async scheduleJob(
    entityType: string,
    entityId: string,
    orgId: string,
    followUpType: FollowUpType,
    delayMs: number,
  ): Promise<void> {
    const key = this.jobKey(entityType, entityId, followUpType);

    // Cancel existing job of same type if present
    this.cancelJobByKey(key);

    // Create the automation_run record now (in "pending" status)
    const run = await this.createPendingRun(entityType, entityId, orgId, followUpType, delayMs);
    if (!run) return;

    const scheduledFor = new Date(Date.now() + delayMs);

    const timeoutId = setTimeout(() => {
      this.jobs.delete(key);
      this.executeJob(run).catch((err) => {
        console.error(`[FollowUpManager] Job execution failed for ${key}:`, err);
      });
    }, delayMs);

    // Allow Node to exit even if this timer is pending
    timeoutId.unref();

    this.jobs.set(key, {
      timeoutId,
      entityType,
      entityId,
      orgId,
      runId: run.runId,
      scheduledFor,
    });
  }

  /**
   * Cancels a specific job by its key.
   */
  private cancelJobByKey(key: string): void {
    const existing = this.jobs.get(key);
    if (existing) {
      clearTimeout(existing.timeoutId);
      this.jobs.delete(key);
    }
  }

  /**
   * Creates a pending automation_run record for tracking.
   * Lazily creates the parent automation record if needed.
   */
  private async createPendingRun(
    entityType: string,
    entityId: string,
    orgId: string,
    followUpType: FollowUpType,
    delayMs: number,
  ): Promise<FollowUpRun | null> {
    try {
      // Get or create the "follow_up" system automation for this org
      const automationId = await this.ensureFollowUpAutomation(orgId);

      const [run] = await db
        .insert(schema.automationRuns)
        .values({
          orgId,
          automationId,
          status: "pending",
          triggerEntityType: entityType,
          triggerEntityId: entityId,
          result: {
            followUpType,
            delayMs,
            scheduledFor: new Date(Date.now() + delayMs).toISOString(),
          },
        })
        .returning();

      if (!run) return null;

      return {
        automationId,
        runId: run.id,
        entityType,
        entityId,
        orgId,
        followUpType,
        scheduledFor: new Date(Date.now() + delayMs),
        status: "pending",
      };
    } catch (err) {
      console.error("[FollowUpManager] Failed to create pending run:", err);
      return null;
    }
  }

  /**
   * Ensures a "system_follow_up" automation record exists for the org.
   */
  private async ensureFollowUpAutomation(orgId: string): Promise<string> {
    // Check if one already exists
    const [existing] = await db
      .select({ id: schema.automations.id })
      .from(schema.automations)
      .where(
        and(
          eq(schema.automations.orgId, orgId),
          eq(schema.automations.trigger, "system_follow_up"),
        ),
      )
      .limit(1);

    if (existing) return existing.id;

    // Create it
    const [automation] = await db
      .insert(schema.automations)
      .values({
        orgId,
        name: "System Follow-ups",
        description: "Automatically generated follow-up reminders and recovery messages",
        trigger: "system_follow_up",
        triggerConfig: {},
        action: "ai_response",
        actionConfig: { type: "follow_up" },
        isActive: true,
      })
      .returning();

    if (!automation) {
      throw new Error("Failed to create follow-up automation record");
    }

    return automation.id;
  }

  /**
   * Executes a scheduled job: creates messages, activities, or notifications
   * based on the follow-up type and entity.
   */
  private async executeJob(run: FollowUpRun): Promise<void> {
    console.log(`[FollowUpManager] Executing ${run.followUpType} for ${run.entityType} ${run.entityId}`);

    try {
      // Mark run as started
      await db
        .update(schema.automationRuns)
        .set({ status: "running", startedAt: new Date() })
        .where(eq(schema.automationRuns.id, run.runId));

      const messageContent = await this.generateMessage(run);

      if (messageContent) {
        await this.deliverMessage(run, messageContent);
      }

      // Mark run as completed
      await db
        .update(schema.automationRuns)
        .set({
          status: "completed",
          completedAt: new Date(),
          result: { ...run, messageContent, delivered: true },
        })
        .where(eq(schema.automationRuns.id, run.runId));
    } catch (err) {
      console.error(`[FollowUpManager] Job ${run.runId} failed:`, err);
      await db
        .update(schema.automationRuns)
        .set({
          status: "failed",
          completedAt: new Date(),
          errorMessage: err instanceof Error ? err.message : "Unknown error",
        })
        .where(eq(schema.automationRuns.id, run.runId));
    }
  }

  /**
   * Generates a follow-up message based on the follow-up type.
   * Uses simple templates — AI generation can be layered on later.
   */
  private async generateMessage(run: FollowUpRun): Promise<string | null> {
    switch (run.followUpType) {
      case "quote_follow_up_2d": {
        const quote = await this.loadQuote(run.orgId, run.entityId);
        if (!quote) return null;
        const customerName = quote.customerName ?? "there";
        return `Hi ${customerName}, just checking in on the quote we sent for "${quote.title}". Let us know if you have any questions — we're happy to walk through it!`;
      }

      case "quote_follow_up_5d": {
        const quote = await this.loadQuote(run.orgId, run.entityId);
        if (!quote) return null;
        const customerName = quote.customerName ?? "there";
        return `Hi ${customerName}, following up on the "${quote.title}" quote. We'd love to get started on this for you. Any thoughts or questions?`;
      }

      case "quote_follow_up_10d": {
        const quote = await this.loadQuote(run.orgId, run.entityId);
        if (!quote) return null;
        const customerName = quote.customerName ?? "there";
        return `Hi ${customerName}, one last check-in about the "${quote.title}" quote. The offer is still open — just reply here if you'd like to move forward!`;
      }

      case "appointment_reminder_24h": {
        const apt = await this.loadAppointment(run.orgId, run.entityId);
        if (!apt) return null;
        const customerName = apt.customerName ?? "there";
        const time = apt.scheduledStart
          ? new Date(apt.scheduledStart).toLocaleString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })
          : "your scheduled time";
        return `Hi ${customerName}, this is a reminder about your appointment tomorrow — ${time}. Reply YES to confirm or call us if you need to reschedule.`;
      }

      case "appointment_reminder_1h": {
        const apt = await this.loadAppointment(run.orgId, run.entityId);
        if (!apt) return null;
        const customerName = apt.customerName ?? "there";
        return `Hi ${customerName}, our technician is on the way for your appointment in about an hour. See you soon!`;
      }

      case "inactive_lead_recovery_14d": {
        const lead = await this.loadLead(run.orgId, run.entityId);
        if (!lead) return null;
        const customerName = lead.contactName ?? "there";
        const title = lead.title ?? "your project";
        return `Hi ${customerName}, we haven't heard from you in a bit regarding "${title}". Still interested? Reply here and we'll pick right back up!`;
      }

      case "review_request_3d": {
        const job = await this.loadJob(run.orgId, run.entityId);
        if (!job) return null;
        const customerName = job.customerName ?? "there";
        const title = job.title ?? "your recent service";
        return `Hi ${customerName}, we hope you're happy with "${title}"! We'd love your feedback — it helps us improve and helps others find us. Would you take a moment to leave a quick review?`;
      }

      default:
        return null;
    }
  }

  /**
   * Delivers a message: inserts into the conversations/messages tables
   * and creates an activity on the relevant entity.
   */
  private async deliverMessage(run: FollowUpRun, content: string): Promise<void> {
    // Find or create a conversation for this entity
    const conversationId = await this.findOrCreateConversation(run);

    if (conversationId) {
      // Insert the message
      await db.insert(schema.messages).values({
        orgId: run.orgId,
        conversationId,
        role: "ai",
        content,
        metadata: {
          followUpType: run.followUpType,
          automationRunId: run.runId,
          entityType: run.entityType,
          entityId: run.entityId,
        },
      });

      // Update conversation metadata
      await db
        .update(schema.conversations)
        .set({
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.conversations.id, conversationId));

      // Also create an activity on the lead if applicable
      await this.createActivity(run, content);
    }
  }

  /**
   * Finds or creates a conversation for the target entity.
   */
  private async findOrCreateConversation(run: FollowUpRun): Promise<string | null> {
    // Try finding existing conversation for this entity
    let customerId: string | null = null;
    let leadId: string | null = null;

    switch (run.entityType) {
      case "quote": {
        const quote = await this.loadQuote(run.orgId, run.entityId);
        customerId = quote?.customerId ?? null;
        leadId = quote?.leadId ?? null;
        break;
      }
      case "appointment": {
        const apt = await this.loadAppointment(run.orgId, run.entityId);
        customerId = apt?.customerId ?? null;
        leadId = apt?.leadId ?? null;
        break;
      }
      case "lead": {
        leadId = run.entityId;
        const lead = await this.loadLead(run.orgId, run.entityId);
        customerId = lead?.customerId ?? null;
        break;
      }
      case "job": {
        const job = await this.loadJob(run.orgId, run.entityId);
        customerId = job?.customerId ?? null;
        leadId = job?.leadId ?? null;
        break;
      }
    }

    if (!customerId && !leadId) return null;

    // Look for existing conversation
    const conditions = [eq(schema.conversations.orgId, run.orgId)];
    if (customerId) conditions.push(eq(schema.conversations.customerId, customerId));
    if (leadId) conditions.push(eq(schema.conversations.leadId, leadId));

    const [existing] = await db
      .select({ id: schema.conversations.id })
      .from(schema.conversations)
      .where(and(...conditions))
      .limit(1);

    if (existing) return existing.id;

    // Create new conversation
    const [conversation] = await db
      .insert(schema.conversations)
      .values({
        orgId: run.orgId,
        customerId,
        leadId,
        channel: "chat",
        subject: `Follow-up: ${run.followUpType.replace(/_/g, " ")}`,
        status: "active",
        isAiHandled: true,
      })
      .returning();

    return conversation?.id ?? null;
  }

  /**
   * Creates a lead activity for the follow-up.
   */
  private async createActivity(run: FollowUpRun, content: string): Promise<void> {
    let leadId: string | null = null;

    switch (run.entityType) {
      case "lead":
        leadId = run.entityId;
        break;
      case "quote": {
        const quote = await this.loadQuote(run.orgId, run.entityId);
        leadId = quote?.leadId ?? null;
        break;
      }
      case "appointment": {
        const apt = await this.loadAppointment(run.orgId, run.entityId);
        leadId = apt?.leadId ?? null;
        break;
      }
      case "job": {
        const job = await this.loadJob(run.orgId, run.entityId);
        leadId = job?.leadId ?? null;
        break;
      }
    }

    if (!leadId) return;

    try {
      await db.insert(schema.leadActivities).values({
        orgId: run.orgId,
        leadId,
        userId: null,
        activityType: "follow_up_sent",
        description: content.length > 200 ? content.slice(0, 197) + "..." : content,
        metadata: {
          followUpType: run.followUpType,
          automationRunId: run.runId,
        },
      });
    } catch (err) {
      console.error("[FollowUpManager] Failed to create activity:", err);
    }
  }

  // ---- Entity loaders ----

  private async loadQuote(orgId: string, quoteId: string) {
    const [quote] = await db
      .select({
        id: schema.quotes.id,
        title: schema.quotes.title,
        leadId: schema.quotes.leadId,
        customerId: schema.quotes.customerId,
        status: schema.quotes.status,
        customerFirstName: schema.customers.firstName,
        customerLastName: schema.customers.lastName,
      })
      .from(schema.quotes)
      .leftJoin(schema.customers, eq(schema.quotes.customerId, schema.customers.id))
      .where(and(eq(schema.quotes.id, quoteId), eq(schema.quotes.orgId, orgId)))
      .limit(1);

    if (!quote) return null;
    return {
      ...quote,
      customerName: quote.customerFirstName
        ? `${quote.customerFirstName} ${quote.customerLastName ?? ""}`.trim()
        : null,
    };
  }

  private async loadAppointment(orgId: string, appointmentId: string) {
    const [apt] = await db
      .select({
        id: schema.appointments.id,
        title: schema.appointments.title,
        scheduledStart: schema.appointments.scheduledStart,
        customerId: schema.appointments.customerId,
        leadId: schema.appointments.leadId,
        customerFirstName: schema.customers.firstName,
        customerLastName: schema.customers.lastName,
      })
      .from(schema.appointments)
      .leftJoin(schema.customers, eq(schema.appointments.customerId, schema.customers.id))
      .where(
        and(
          eq(schema.appointments.id, appointmentId),
          eq(schema.appointments.orgId, orgId),
        ),
      )
      .limit(1);

    if (!apt) return null;
    return {
      ...apt,
      customerName: apt.customerFirstName
        ? `${apt.customerFirstName} ${apt.customerLastName ?? ""}`.trim()
        : null,
    };
  }

  private async loadLead(orgId: string, leadId: string) {
    const [lead] = await db
      .select({
        id: schema.leads.id,
        title: schema.leads.title,
        contactName: schema.leads.contactName,
        customerId: schema.leads.customerId,
        stage: schema.leads.stage,
      })
      .from(schema.leads)
      .where(and(eq(schema.leads.id, leadId), eq(schema.leads.orgId, orgId)))
      .limit(1);

    return lead ?? null;
  }

  private async loadJob(orgId: string, jobId: string) {
    const [job] = await db
      .select({
        id: schema.jobs.id,
        title: schema.jobs.title,
        customerId: schema.jobs.customerId,
        leadId: schema.jobs.leadId,
        status: schema.jobs.status,
        customerFirstName: schema.customers.firstName,
        customerLastName: schema.customers.lastName,
      })
      .from(schema.jobs)
      .leftJoin(schema.customers, eq(schema.jobs.customerId, schema.customers.id))
      .where(and(eq(schema.jobs.id, jobId), eq(schema.jobs.orgId, orgId)))
      .limit(1);

    if (!job) return null;
    return {
      ...job,
      customerName: job.customerFirstName
        ? `${job.customerFirstName} ${job.customerLastName ?? ""}`.trim()
        : null,
    };
  }

  /**
   * Lists automation runs of type follow_up for a given org.
   */
  async listFollowUps(
    orgId: string,
    filters?: { status?: string; limit?: number; offset?: number },
  ): Promise<{ data: unknown[]; total: number }> {
    const { status, limit = 20, offset = 0 } = filters ?? {};

    const conditions = [
      eq(schema.automationRuns.orgId, orgId),
    ];

    // Only return runs from the system follow-up automation
    const followUpAutomation = await db
      .select({ id: schema.automations.id })
      .from(schema.automations)
      .where(
        and(
          eq(schema.automations.orgId, orgId),
          eq(schema.automations.trigger, "system_follow_up"),
        ),
      )
      .limit(1);

    if (followUpAutomation.length > 0) {
      conditions.push(eq(schema.automationRuns.automationId, followUpAutomation[0]!.id));
    } else {
      return { data: [], total: 0 };
    }

    if (status) {
      conditions.push(eq(schema.automationRuns.status, status));
    }

    const rows = await db
      .select()
      .from(schema.automationRuns)
      .where(and(...conditions))
      .orderBy(desc(schema.automationRuns.createdAt))
      .limit(limit)
      .offset(offset);

    // Count total
    const countResult = await db
      .select({ total: count() })
      .from(schema.automationRuns)
      .where(and(...conditions));

    return {
      data: rows,
      total: Number(countResult[0]?.total ?? 0),
    };
  }

  /**
   * Manually triggers a follow-up for the given entity.
   */
  async triggerNow(entityType: string, entityId: string, orgId: string): Promise<FollowUpRun | null> {
    const followUpType = this.inferFollowUpType(entityType);
    const run = await this.createPendingRun(entityType, entityId, orgId, followUpType, 0);
    if (!run) return null;

    // Execute immediately
    await this.executeJob(run);
    return run;
  }

  private inferFollowUpType(entityType: string): FollowUpType {
    switch (entityType) {
      case "quote":
        return "quote_follow_up_2d";
      case "appointment":
        return "appointment_reminder_24h";
      case "lead":
        return "inactive_lead_recovery_14d";
      case "job":
        return "review_request_3d";
      default:
        return "quote_follow_up_2d";
    }
  }
}

// ---- Singleton ----

let defaultFollowUpManager: FollowUpManager | null = null;

export function getFollowUpManager(): FollowUpManager {
  if (!defaultFollowUpManager) {
    defaultFollowUpManager = new FollowUpManager();
  }
  return defaultFollowUpManager;
}
