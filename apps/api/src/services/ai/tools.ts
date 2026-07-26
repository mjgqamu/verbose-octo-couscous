// SitePilot AI — Tool Definitions & Tool Executor
// Defines all tools the AI receptionist can call, plus the executor
// that actually runs them against the database.

import { db, schema, eq, and, gte, lte, or, sql } from "@sitepilot/db";
import type { LLMToolDefinition } from "./llm.js";
import * as leadsService from "../leads.js";
import * as customersService from "../customers.js";

// ---- Tool Definitions ----

export const createLeadTool: LLMToolDefinition = {
  type: "function",
  function: {
    name: "create_lead",
    description:
      "Creates a new lead in the CRM with contact information and service requirements. Use when a prospective customer provides their details and needs a service.",
    parameters: {
      type: "object",
      properties: {
        firstName: {
          type: "string",
          description: "Customer's first name",
        },
        lastName: {
          type: "string",
          description: "Customer's last name",
        },
        phone: {
          type: "string",
          description: "Customer's phone number",
        },
        email: {
          type: "string",
          description: "Customer's email address",
        },
        address: {
          type: "string",
          description: "Customer's address or service location",
        },
        serviceRequired: {
          type: "string",
          description: "Description of the service the customer needs",
        },
        urgency: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
          description: "How urgent is the service request",
        },
        notes: {
          type: "string",
          description: "Additional notes about the lead",
        },
        source: {
          type: "string",
          enum: ["phone", "chat", "whatsapp", "web_form"],
          description: "Where this lead originated",
        },
      },
      required: ["firstName", "lastName", "serviceRequired"],
    },
  },
};

export const checkAvailabilityTool: LLMToolDefinition = {
  type: "function",
  function: {
    name: "check_availability",
    description:
      "Checks available time slots for a given date range. Returns open slots that are not already booked.",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "ISO date string (YYYY-MM-DD) to start checking from",
        },
        daysAhead: {
          type: "number",
          description: "Number of days to check ahead (default: 7)",
        },
      },
    },
  },
};

export const bookAppointmentTool: LLMToolDefinition = {
  type: "function",
  function: {
    name: "book_appointment",
    description:
      "Books an appointment for a customer. Creates the customer and lead if needed, then schedules the appointment.",
    parameters: {
      type: "object",
      properties: {
        customerName: {
          type: "string",
          description: "Full name of the customer",
        },
        customerPhone: {
          type: "string",
          description: "Customer's phone number",
        },
        customerEmail: {
          type: "string",
          description: "Customer's email address",
        },
        serviceType: {
          type: "string",
          description: "Type of service requested",
        },
        preferredDate: {
          type: "string",
          description: "Preferred date for the appointment (ISO date YYYY-MM-DD)",
        },
        preferredTime: {
          type: "string",
          enum: ["morning", "afternoon", "any"],
          description: "Preferred time of day",
        },
        notes: {
          type: "string",
          description: "Additional notes for the appointment",
        },
      },
    },
  },
};

export const searchKnowledgeTool: LLMToolDefinition = {
  type: "function",
  function: {
    name: "search_knowledge",
    description:
      "Searches the business knowledge base for relevant information about services, pricing, policies, FAQs, etc.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query to find relevant knowledge",
        },
      },
      required: ["query"],
    },
  },
};

export const escalateToHumanTool: LLMToolDefinition = {
  type: "function",
  function: {
    name: "escalate_to_human",
    description:
      "Escalates the conversation to a human team member. Use when the AI cannot adequately handle the request or when the customer explicitly asks for a human.",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Reason for escalation",
        },
        priority: {
          type: "string",
          enum: ["normal", "urgent"],
          description: "Priority of the escalation",
        },
      },
      required: ["reason"],
    },
  },
};

export const getBusinessInfoTool: LLMToolDefinition = {
  type: "function",
  function: {
    name: "get_business_info",
    description:
      "Returns information about the business including hours of operation, services offered, location, and contact details.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
};

// ---- All tools ----

export const ALL_RECEPTIONIST_TOOLS: LLMToolDefinition[] = [
  createLeadTool,
  checkAvailabilityTool,
  bookAppointmentTool,
  searchKnowledgeTool,
  escalateToHumanTool,
  getBusinessInfoTool,
];

// ---- Tool Executor ----

export interface ToolExecutionContext {
  orgId: string;
  conversationId: string;
  userId?: string;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export class ToolExecutor {
  private orgId: string;
  private context: ToolExecutionContext;

  constructor(context: ToolExecutionContext) {
    this.orgId = context.orgId;
    this.context = context;
  }

  async execute(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (toolName) {
        case "create_lead":
          return await this.createLead(args);
        case "check_availability":
          return await this.checkAvailability(args);
        case "book_appointment":
          return await this.bookAppointment(args);
        case "search_knowledge":
          return await this.searchKnowledge(args);
        case "escalate_to_human":
          return await this.escalateToHuman(args);
        case "get_business_info":
          return await this.getBusinessInfo();
        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Tool execution failed";
      console.error(`Tool ${toolName} error:`, message);
      return { success: false, error: message };
    }
  }

  private async createLead(args: Record<string, unknown>): Promise<ToolResult> {
    const firstName = (args.firstName as string) || "";
    const lastName = (args.lastName as string) || "";
    const phone = (args.phone as string) || undefined;
    const email = (args.email as string) || undefined;
    const address = (args.address as string) || undefined;
    const serviceRequired = (args.serviceRequired as string) || "General inquiry";
    const urgency = (args.urgency as string) || "medium";
    const notes = (args.notes as string) || undefined;
    const source = (args.source as string) || "chat";

    // Map urgency to priority number
    const priorityMap: Record<string, number> = {
      low: 2,
      medium: 5,
      high: 8,
      critical: 10,
    };
    const priority = priorityMap[urgency] ?? 5;

    // Build a title from service required
    const title = `${serviceRequired} - ${firstName} ${lastName}`.slice(0, 500);

    // Build description combining address and notes
    const parts: string[] = [];
    if (address) parts.push(`Address: ${address}`);
    if (notes) parts.push(`Notes: ${notes}`);
    const description = parts.join("\n") || undefined;

    const lead = await leadsService.createLead({
      orgId: this.orgId,
      contactName: `${firstName} ${lastName}`.trim(),
      contactPhone: phone,
      contactEmail: email,
      source,
      sourceDetail: `AI Receptionist via ${source}`,
      title,
      description,
      serviceType: serviceRequired,
      priority,
      stage: "new",
      tags: ["ai_receptionist"],
    });

    if (!lead) {
      return { success: false, error: "Failed to create lead" };
    }

    return {
      success: true,
      data: {
        leadId: lead.id,
        name: `${firstName} ${lastName}`,
        message: `Lead created successfully for ${firstName} ${lastName} regarding ${serviceRequired}.`,
      },
    };
  }

  private async checkAvailability(args: Record<string, unknown>): Promise<ToolResult> {
    const dateStr = (args.date as string) || new Date().toISOString().split("T")[0];
    const daysAhead = (args.daysAhead as number) || 7;

    const startDate = new Date(dateStr!);
    // Set to start of day
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + daysAhead);
    endDate.setHours(23, 59, 59, 999);

    // Get existing appointments in range
    const existingAppointments = await db
      .select({
        id: schema.appointments.id,
        scheduledStart: schema.appointments.scheduledStart,
        scheduledEnd: schema.appointments.scheduledEnd,
        title: schema.appointments.title,
      })
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.orgId, this.orgId),
          gte(schema.appointments.scheduledStart, startDate),
          lte(schema.appointments.scheduledStart, endDate),
        ),
      )
      .orderBy(schema.appointments.scheduledStart);

    // Generate available time slots (business hours 8am-5pm, 2hr slots)
    const slots: Array<{ date: string; startTime: string; endTime: string; available: boolean }> = [];
    const now = new Date();

    for (let d = 0; d < daysAhead; d++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + d);

      // Skip Sundays
      if (currentDate.getDay() === 0) continue;

      const dateStr2 = currentDate.toISOString().split("T")[0]!;
      const timeSlots = [
        { start: "08:00", end: "10:00" },
        { start: "10:00", end: "12:00" },
        { start: "13:00", end: "15:00" },
        { start: "15:00", end: "17:00" },
      ];

      for (const slot of timeSlots) {
        const slotStart = new Date(`${dateStr2}T${slot.start}:00`);
        const slotEnd = new Date(`${dateStr2}T${slot.end}:00`);

        // Skip past slots
        if (slotStart <= now) continue;

        // Check for conflicts
        const hasConflict = existingAppointments.some((apt) => {
          if (!apt.scheduledStart || !apt.scheduledEnd) return false;
          return slotStart < apt.scheduledEnd && slotEnd > apt.scheduledStart;
        });

        slots.push({
          date: dateStr2,
          startTime: slot.start,
          endTime: slot.end,
          available: !hasConflict,
        });
      }
    }

    const availableSlots = slots.filter((s) => s.available);

    return {
      success: true,
      data: {
        totalSlots: slots.length,
        availableSlots: availableSlots.length,
        slots: availableSlots.slice(0, 10),
        message:
          availableSlots.length > 0
            ? `Found ${availableSlots.length} available time slots in the next ${daysAhead} days.`
            : `No available time slots found in the next ${daysAhead} days.`,
      },
    };
  }

  private async bookAppointment(args: Record<string, unknown>): Promise<ToolResult> {
    const customerName = (args.customerName as string) || "";
    const customerPhone = (args.customerPhone as string) || undefined;
    const customerEmail = (args.customerEmail as string) || undefined;
    const serviceType = (args.serviceType as string) || "General service";
    const preferredDate = (args.preferredDate as string) || new Date().toISOString().split("T")[0];
    const preferredTime = (args.preferredTime as string) || "any";
    const notes = (args.notes as string) || undefined;

    // Split name
    const nameParts = customerName.trim().split(/\s+/);
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.slice(1).join(" ") || "Unknown";

    // Find or create customer
    let customerId: string | undefined;

    if (customerEmail) {
      const [existing] = await db
        .select({ id: schema.customers.id })
        .from(schema.customers)
        .where(
          and(
            eq(schema.customers.orgId, this.orgId),
            eq(schema.customers.email, customerEmail),
          ),
        )
        .limit(1);
      customerId = existing?.id;
    }

    if (!customerId && customerPhone) {
      const [existing] = await db
        .select({ id: schema.customers.id })
        .from(schema.customers)
        .where(
          and(
            eq(schema.customers.orgId, this.orgId),
            eq(schema.customers.phone, customerPhone),
          ),
        )
        .limit(1);
      customerId = existing?.id;
    }

    if (!customerId) {
      const customer = await customersService.createCustomer({
        orgId: this.orgId,
        firstName,
        lastName,
        email: customerEmail,
        phone: customerPhone,
        source: "ai_chat",
      });
      if (customer) {
        customerId = customer.id;
      } else {
        return { success: false, error: "Failed to create customer" };
      }
    }

    // Create a lead for this appointment
    const lead = await leadsService.createLead({
      orgId: this.orgId,
      customerId,
      contactName: `${firstName} ${lastName}`,
      contactPhone: customerPhone,
      contactEmail: customerEmail,
      source: "website_chat",
      sourceDetail: "Booked via AI Receptionist",
      title: `${serviceType} appointment for ${firstName} ${lastName}`,
      description: notes,
      serviceType,
      stage: "job_scheduled",
      priority: 6,
      tags: ["ai_receptionist", "appointment_booked"],
    });

    if (!lead) {
      return { success: false, error: "Failed to create lead for appointment" };
    }

    // Determine time range
    let startHour = 10;
    let endHour = 12;
    if (preferredTime === "morning") {
      startHour = 8;
      endHour = 10;
    } else if (preferredTime === "afternoon") {
      startHour = 14;
      endHour = 16;
    }

    const scheduledStart = new Date(`${preferredDate}T${String(startHour).padStart(2, "0")}:00:00`);
    const scheduledEnd = new Date(`${preferredDate}T${String(endHour).padStart(2, "0")}:00:00`);

    // Create the appointment
    const [appointment] = await db
      .insert(schema.appointments)
      .values({
        orgId: this.orgId,
        customerId,
        leadId: lead.id,
        title: `${serviceType} - ${firstName} ${lastName}`,
        description: notes ?? null,
        status: "scheduled",
        scheduledStart,
        scheduledEnd,
        timezone: "UTC",
        notes: notes ?? null,
      })
      .returning();

    if (!appointment) {
      return { success: false, error: "Failed to create appointment" };
    }

    return {
      success: true,
      data: {
        appointmentId: appointment.id,
        leadId: lead.id,
        customerId,
        scheduledStart: scheduledStart.toISOString(),
        message: `Appointment booked for ${firstName} ${lastName} on ${preferredDate} (${preferredTime}). A team member will confirm the exact time.`,
      },
    };
  }

  private async searchKnowledge(args: Record<string, unknown>): Promise<ToolResult> {
    const query = (args.query as string) || "";
    if (!query.trim()) {
      return { success: false, error: "Search query is required" };
    }

    // Split query into keywords
    const keywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((k) => k.length > 1);

    if (keywords.length === 0) {
      return { success: true, data: { documents: [], message: "No search terms found." } };
    }

    // Build ILIKE conditions
    const conditions = keywords.map((keyword) => {
      const pattern = `%${keyword}%`;
      return or(
        sql`${schema.aiKnowledgeDocuments.title} ILIKE ${pattern}`,
        sql`${schema.aiKnowledgeDocuments.content} ILIKE ${pattern}`,
      );
    });

    const docs = await db
      .select({
        id: schema.aiKnowledgeDocuments.id,
        title: schema.aiKnowledgeDocuments.title,
        content: schema.aiKnowledgeDocuments.content,
        contentType: schema.aiKnowledgeDocuments.contentType,
        metadata: schema.aiKnowledgeDocuments.metadata,
      })
      .from(schema.aiKnowledgeDocuments)
      .where(
        and(
          eq(schema.aiKnowledgeDocuments.orgId, this.orgId),
          or(...conditions),
        ),
      )
      .limit(10);

    // Score by keyword match count
    const scored = docs.map((doc) => {
      const contentLower = (doc.content + " " + doc.title).toLowerCase();
      let relevance = 0;
      for (const kw of keywords) {
        const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
        const matches = contentLower.match(regex);
        if (matches) relevance += matches.length;
      }
      return {
        title: doc.title,
        content: doc.content,
        relevance,
      };
    });

    // Sort by relevance, take top 5
    scored.sort((a, b) => b.relevance - a.relevance);
    const top5 = scored.slice(0, 5);

    return {
      success: true,
      data: {
        documents: top5,
        message:
          top5.length > 0
            ? `Found ${top5.length} relevant knowledge articles.`
            : "No relevant knowledge articles found.",
      },
    };
  }

  private async escalateToHuman(args: Record<string, unknown>): Promise<ToolResult> {
    const reason = (args.reason as string) || "No reason provided";
    const priority = (args.priority as string) || "normal";

    // Update the conversation to mark as escalated
    await db
      .update(schema.conversations)
      .set({
        aiEscalated: true,
        escalationReason: `[${priority.toUpperCase()}] ${reason}`,
        updatedAt: new Date(),
      })
      .where(eq(schema.conversations.id, this.context.conversationId));

    // Add a system message about the escalation
    await db.insert(schema.messages).values({
      orgId: this.orgId,
      conversationId: this.context.conversationId,
      role: "system",
      content: `Escalated to human team: [${priority}] ${reason}`,
    });

    return {
      success: true,
      data: {
        escalated: true,
        priority,
        message: `This conversation has been escalated to our team with ${priority} priority. Someone will follow up shortly.`,
      },
    };
  }

  private async getBusinessInfo(): Promise<ToolResult> {
    // Get org details
    const [org] = await db
      .select({
        name: schema.organizations.name,
        phone: schema.organizations.phone,
        email: schema.organizations.email,
        website: schema.organizations.website,
        addressLine1: schema.organizations.addressLine1,
        city: schema.organizations.city,
        state: schema.organizations.state,
        postalCode: schema.organizations.postalCode,
        country: schema.organizations.country,
        timezone: schema.organizations.timezone,
        businessHours: schema.organizations.businessHours,
      })
      .from(schema.organizations)
      .where(eq(schema.organizations.id, this.orgId))
      .limit(1);

    // Get active AI receptionist config
    const [aiConfig] = await db
      .select({
        id: schema.aiConfigurations.id,
        personality: schema.aiConfigurations.personality,
        knowledgeBase: schema.aiConfigurations.knowledgeBase,
      })
      .from(schema.aiConfigurations)
      .where(
        and(
          eq(schema.aiConfigurations.orgId, this.orgId),
          eq(schema.aiConfigurations.configType, "receptionist"),
          eq(schema.aiConfigurations.isActive, true),
        ),
      )
      .limit(1);

    const businessHours = (org?.businessHours as Record<string, unknown>) ?? {};
    const personality = (aiConfig?.personality as Record<string, unknown>) ?? {};
    const services = (aiConfig?.knowledgeBase as unknown[]) ?? [];

    const address = [org?.addressLine1, org?.city, org?.state, org?.postalCode]
      .filter(Boolean)
      .join(", ");

    return {
      success: true,
      data: {
        businessName: org?.name ?? "Our business",
        phone: org?.phone ?? null,
        email: org?.email ?? null,
        website: org?.website ?? null,
        address: address || null,
        timezone: org?.timezone ?? "UTC",
        businessHours,
        services: Array.isArray(services)
          ? services.map((s: unknown) => {
              const svc = s as Record<string, unknown>;
              return svc.name ?? svc;
            })
          : [],
        greeting: (personality.greeting as string) ?? "Hello! How can we help you today?",
      },
    };
  }
}
