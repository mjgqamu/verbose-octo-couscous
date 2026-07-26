// SitePilot AI — Calendar & Booking Service
// Availability manager and appointment booking with conflict detection.

import { db, schema, eq, and, gte, lte, asc, count } from "@sitepilot/db";
import type { AppointmentStatus } from "@sitepilot/shared";
import * as customersService from "./customers.js";
import * as leadsService from "./leads.js";
import { getFollowUpManager } from "./follow-ups.js";

// ---- Types ----

export interface TimeSlot {
  date: string;
  time: string;
  slot: string;
}

export interface BusinessHours {
  [day: string]: { start: string; end: string } | null;
  // e.g. { monday: { start: "08:00", end: "17:00" }, ... }
}

export interface CreateAppointmentData {
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceType: string;
  date: string;
  time: string;
  notes?: string;
  technicianId?: string;
  title?: string;
}

export interface RescheduleData {
  newDate: string;
  newTime: string;
}

export interface AppointmentFilters {
  date?: string;
  technicianId?: string;
  status?: AppointmentStatus;
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}

// ---- Default Business Hours ----
const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  monday: { start: "08:00", end: "17:00" },
  tuesday: { start: "08:00", end: "17:00" },
  wednesday: { start: "08:00", end: "17:00" },
  thursday: { start: "08:00", end: "17:00" },
  friday: { start: "08:00", end: "17:00" },
  saturday: null,
  sunday: null,
};

const DAY_MAP: Record<number, string> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

// ---- AvailabilityManager ----

export class AvailabilityManager {
  /**
   * Returns all available 2-hour time slots for the given date range.
   */
  async getAvailableSlots(
    orgId: string,
    date: string,
    daysAhead: number = 7,
  ): Promise<TimeSlot[]> {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + daysAhead);
    endDate.setHours(23, 59, 59, 999);

    // Load business hours from org's AI config or use defaults
    const businessHours = await this.getBusinessHours(orgId);

    // Load existing appointments in range (excluding cancelled)
    const existingAppointments = await db
      .select({
        id: schema.appointments.id,
        scheduledStart: schema.appointments.scheduledStart,
        scheduledEnd: schema.appointments.scheduledEnd,
        title: schema.appointments.title,
        status: schema.appointments.status,
      })
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.orgId, orgId),
          gte(schema.appointments.scheduledStart, startDate),
          lte(schema.appointments.scheduledStart, endDate),
        ),
      );

    // Note: technician work schedules from the technicians table can be
    // consulted for per-tech availability in a future enhancement.

    const slots: TimeSlot[] = [];
    const now = new Date();

    for (let d = 0; d < daysAhead; d++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + d);

      const dayName = DAY_MAP[currentDate.getDay()];
      if (!dayName) continue;
      const dayHours = businessHours[dayName];

      // Skip days with no business hours
      if (!dayHours) continue;

      const dateStr = currentDate.toISOString().split("T")[0]!;

      // Generate 2-hour slots within business hours
      const startHour = parseInt(dayHours.start.split(":")[0]!);
      const endHour = parseInt(dayHours.end.split(":")[0]!);

      for (let h = startHour; h < endHour; h++) {
        const slotStart = `${String(h).padStart(2, "0")}:00`;
        const slotEnd = `${String(h + 2).padStart(2, "0")}:00`;
        const slotLabel = `${slotStart}-${slotEnd}`;

        const slotStartDate = new Date(`${dateStr}T${slotStart}:00`);
        const slotEndDate = new Date(`${dateStr}T${slotEnd}:00`);

        // Skip past slots
        if (slotStartDate <= now) continue;

        // Skip slots that would go past business hours
        if (h + 2 > endHour) continue;

        // Check existing appointment conflicts
        const hasConflict = existingAppointments.some((apt) => {
          if (!apt.scheduledStart || !apt.scheduledEnd) return false;
          if (apt.status === "cancelled") return false;
          return slotStartDate < apt.scheduledEnd && slotEndDate > apt.scheduledStart;
        });

        if (!hasConflict) {
          slots.push({
            date: dateStr,
            time: slotStart,
            slot: slotLabel,
          });
        }
      }
    }

    return slots;
  }

  /**
   * Checks if a specific time slot is available.
   */
  async isSlotAvailable(
    orgId: string,
    date: string,
    time: string,
    excludeAppointmentId?: string,
  ): Promise<boolean> {
    const slotStart = new Date(`${date}T${time}:00`);
    const slotEnd = new Date(slotStart);
    slotEnd.setHours(slotEnd.getHours() + 2);

    const conditions = [
      eq(schema.appointments.orgId, orgId),
      gte(schema.appointments.scheduledStart, new Date(date + "T00:00:00")),
      lte(schema.appointments.scheduledStart, new Date(date + "T23:59:59")),
    ];

    const appointments = await db
      .select({
        id: schema.appointments.id,
        scheduledStart: schema.appointments.scheduledStart,
        scheduledEnd: schema.appointments.scheduledEnd,
        status: schema.appointments.status,
      })
      .from(schema.appointments)
      .where(and(...conditions));

    const hasConflict = appointments.some((apt) => {
      if (apt.status === "cancelled") return false;
      if (excludeAppointmentId && apt.id === excludeAppointmentId) return false;
      if (!apt.scheduledStart || !apt.scheduledEnd) return false;
      return slotStart < apt.scheduledEnd && slotEnd > apt.scheduledStart;
    });

    return !hasConflict;
  }

  /**
   * Loads business hours for an org.
   */
  private async getBusinessHours(orgId: string): Promise<BusinessHours> {
    // Load AI config for receptionist (may contain custom business hours)
    const [aiConfig] = await db
      .select({
        personality: schema.aiConfigurations.personality,
      })
      .from(schema.aiConfigurations)
      .where(
        and(
          eq(schema.aiConfigurations.orgId, orgId),
          eq(schema.aiConfigurations.configType, "receptionist"),
          eq(schema.aiConfigurations.isActive, true),
        ),
      )
      .limit(1);

    if (aiConfig?.personality) {
      const personality = aiConfig.personality as Record<string, unknown>;
      const configuredHours = personality.businessHours as BusinessHours | undefined;
      if (configuredHours && Object.keys(configuredHours).length > 0) {
        return configuredHours;
      }
    }

    // Also check org-level business hours
    const [org] = await db
      .select({ businessHours: schema.organizations.businessHours })
      .from(schema.organizations)
      .where(eq(schema.organizations.id, orgId))
      .limit(1);

    if (org?.businessHours) {
      const orgHours = org.businessHours as BusinessHours;
      if (Object.keys(orgHours).length > 0) {
        return orgHours;
      }
    }

    return DEFAULT_BUSINESS_HOURS;
  }
}

// ---- BookingService ----

export class BookingService {
  private availability: AvailabilityManager;

  constructor() {
    this.availability = new AvailabilityManager();
  }

  /**
   * Creates a new appointment with conflict checking.
   */
  async createAppointment(orgId: string, data: CreateAppointmentData) {
    // Check slot availability
    const isAvailable = await this.availability.isSlotAvailable(
      orgId,
      data.date,
      data.time,
    );

    if (!isAvailable) {
      throw new Error("CONFLICT: The requested time slot is not available.");
    }

    // Parse the time slot and compute scheduled times
    const scheduledStart = new Date(`${data.date}T${data.time}:00`);
    const scheduledEnd = new Date(scheduledStart);
    scheduledEnd.setHours(scheduledEnd.getHours() + 2);

    if (isNaN(scheduledStart.getTime())) {
      throw new Error("INVALID_DATE: The provided date or time is invalid.");
    }

    // Split customer name
    const nameParts = data.customerName.trim().split(/\s+/);
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.slice(1).join(" ") || "Unknown";

    // Find or create customer
    let customerId: string | undefined;

    if (data.customerEmail) {
      const [existing] = await db
        .select({ id: schema.customers.id })
        .from(schema.customers)
        .where(
          and(
            eq(schema.customers.orgId, orgId),
            eq(schema.customers.email, data.customerEmail),
          ),
        )
        .limit(1);
      customerId = existing?.id;
    }

    if (!customerId && data.customerPhone) {
      const [existing] = await db
        .select({ id: schema.customers.id })
        .from(schema.customers)
        .where(
          and(
            eq(schema.customers.orgId, orgId),
            eq(schema.customers.phone, data.customerPhone),
          ),
        )
        .limit(1);
      customerId = existing?.id;
    }

    if (!customerId) {
      const customer = await customersService.createCustomer({
        orgId,
        firstName,
        lastName,
        email: data.customerEmail,
        phone: data.customerPhone,
        source: "booking",
      });
      if (customer) {
        customerId = customer.id;
      } else {
        throw new Error("FAILED_TO_CREATE_CUSTOMER");
      }
    }

    // Create a lead
    const lead = await leadsService.createLead({
      orgId,
      customerId,
      contactName: `${firstName} ${lastName}`,
      contactPhone: data.customerPhone,
      contactEmail: data.customerEmail,
      source: "website_form",
      sourceDetail: "Booked via calendar",
      title: data.title ?? `${data.serviceType} appointment for ${firstName} ${lastName}`,
      description: data.notes,
      serviceType: data.serviceType,
      stage: "job_scheduled",
      priority: 6,
      tags: ["appointment_booked"],
    });

    // Auto-assign technician (round-robin or first available)
    let technicianIds: string[] = [];
    if (data.technicianId) {
      technicianIds = [data.technicianId];
    } else {
      const [firstTech] = await db
        .select({ id: schema.technicians.id })
        .from(schema.technicians)
        .where(
          and(
            eq(schema.technicians.orgId, orgId),
            eq(schema.technicians.isActive, true),
          ),
        )
        .limit(1);
      if (firstTech) {
        technicianIds = [firstTech.id];
      }
    }

    // Create the appointment
    const [appointment] = await db
      .insert(schema.appointments)
      .values({
        orgId,
        customerId,
        leadId: lead?.id ?? null,
        title: data.title ?? `${data.serviceType} - ${firstName} ${lastName}`,
        description: data.notes ?? null,
        status: "scheduled",
        scheduledStart,
        scheduledEnd,
        timezone: "UTC",
        notes: data.notes ?? null,
        assignedTechnicians: technicianIds,
      })
      .returning();

    if (!appointment) {
      throw new Error("FAILED_TO_CREATE_APPOINTMENT");
    }

    // Fire-and-forget: schedule appointment reminders
    const followUpManager = getFollowUpManager();
    followUpManager.scheduleAppointmentReminder(appointment.id, orgId).catch((err) => {
      console.error(`[BookingService] Failed to schedule reminders for appointment ${appointment.id}:`, err);
    });

    // Load full appointment with relations
    return this.getAppointment(orgId, appointment.id);
  }

  /**
   * Reschedules an appointment to a new date/time with conflict check.
   */
  async rescheduleAppointment(
    appointmentId: string,
    orgId: string,
    data: RescheduleData,
  ) {
    // Verify appointment exists
    const existing = await this.getAppointment(orgId, appointmentId);
    if (!existing) {
      throw new Error("NOT_FOUND: Appointment not found.");
    }

    // Check new slot availability
    const isAvailable = await this.availability.isSlotAvailable(
      orgId,
      data.newDate,
      data.newTime,
      appointmentId, // exclude this appointment from conflict check
    );

    if (!isAvailable) {
      throw new Error("CONFLICT: The requested time slot is not available.");
    }

    // Compute new scheduled times
    const scheduledStart = new Date(`${data.newDate}T${data.newTime}:00`);
    const scheduledEnd = new Date(scheduledStart);
    scheduledEnd.setHours(scheduledEnd.getHours() + 2);

    if (isNaN(scheduledStart.getTime())) {
      throw new Error("INVALID_DATE: The provided date or time is invalid.");
    }

    const [updated] = await db
      .update(schema.appointments)
      .set({
        scheduledStart,
        scheduledEnd,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.appointments.id, appointmentId),
          eq(schema.appointments.orgId, orgId),
        ),
      )
      .returning();

    return updated ?? null;
  }

  /**
   * Soft-cancels an appointment.
   */
  async cancelAppointment(appointmentId: string, orgId: string) {
    const [appointment] = await db
      .update(schema.appointments)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.appointments.id, appointmentId),
          eq(schema.appointments.orgId, orgId),
        ),
      )
      .returning();

    return appointment ?? null;
  }

  /**
   * Updates an appointment's fields.
   */
  async updateAppointment(
    appointmentId: string,
    orgId: string,
    data: {
      status?: AppointmentStatus;
      technicianId?: string;
      date?: string;
      time?: string;
      notes?: string;
      title?: string;
    },
  ) {
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (data.status !== undefined) updates.status = data.status;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.title !== undefined) updates.title = data.title;

    if (data.technicianId !== undefined) {
      updates.assignedTechnicians = [data.technicianId];
    }

    if (data.date && data.time) {
      // Check availability
      const isAvailable = await this.availability.isSlotAvailable(
        orgId,
        data.date,
        data.time,
        appointmentId,
      );
      if (!isAvailable) {
        throw new Error("CONFLICT: The requested time slot is not available.");
      }

      const scheduledStart = new Date(`${data.date}T${data.time}:00`);
      const scheduledEnd = new Date(scheduledStart);
      scheduledEnd.setHours(scheduledEnd.getHours() + 2);

      if (isNaN(scheduledStart.getTime())) {
        throw new Error("INVALID_DATE: The provided date or time is invalid.");
      }

      updates.scheduledStart = scheduledStart;
      updates.scheduledEnd = scheduledEnd;
    }

    const [appointment] = await db
      .update(schema.appointments)
      .set(updates)
      .where(
        and(
          eq(schema.appointments.id, appointmentId),
          eq(schema.appointments.orgId, orgId),
        ),
      )
      .returning();

    return appointment ?? null;
  }

  /**
   * Lists appointments with filters.
   */
  async getAppointments(orgId: string, filters: AppointmentFilters = {}) {
    const {
      date,
      technicianId,
      status,
      page = 1,
      limit = 20,
      dateFrom,
      dateTo,
    } = filters;

    const conditions: ReturnType<typeof eq>[] = [
      eq(schema.appointments.orgId, orgId),
    ];

    if (status) {
      conditions.push(eq(schema.appointments.status, status));
    }

    if (date) {
      const dayStart = new Date(date + "T00:00:00");
      const dayEnd = new Date(date + "T23:59:59");
      conditions.push(gte(schema.appointments.scheduledStart, dayStart));
      conditions.push(lte(schema.appointments.scheduledStart, dayEnd));
    }

    if (dateFrom) {
      conditions.push(gte(schema.appointments.scheduledStart, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(schema.appointments.scheduledStart, new Date(dateTo)));
    }

    if (technicianId) {
      // Use array contains check
      conditions.push(
        eq(schema.appointments.assignedTechnicians, [technicianId] as any),
      );
    }

    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        id: schema.appointments.id,
        orgId: schema.appointments.orgId,
        customerId: schema.appointments.customerId,
        leadId: schema.appointments.leadId,
        title: schema.appointments.title,
        description: schema.appointments.description,
        status: schema.appointments.status,
        scheduledStart: schema.appointments.scheduledStart,
        scheduledEnd: schema.appointments.scheduledEnd,
        timezone: schema.appointments.timezone,
        assignedTechnicians: schema.appointments.assignedTechnicians,
        notes: schema.appointments.notes,
        isAllDay: schema.appointments.isAllDay,
        createdAt: schema.appointments.createdAt,
        updatedAt: schema.appointments.updatedAt,
        // Customer joined
        customerFirstName: schema.customers.firstName,
        customerLastName: schema.customers.lastName,
        customerEmail: schema.customers.email,
        customerPhone: schema.customers.phone,
      })
      .from(schema.appointments)
      .leftJoin(
        schema.customers,
        eq(schema.appointments.customerId, schema.customers.id),
      )
      .where(and(...conditions))
      .orderBy(asc(schema.appointments.scheduledStart))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [totalRow] = await db
      .select({ total: count() })
      .from(schema.appointments)
      .where(and(...conditions));

    const total = totalRow?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: rows.map((row) => ({
        ...row,
        customer: row.customerId
          ? {
              id: row.customerId,
              firstName: row.customerFirstName,
              lastName: row.customerLastName,
              email: row.customerEmail,
              phone: row.customerPhone,
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  /**
   * Gets appointments for a single day.
   */
  async getAppointmentsForDate(orgId: string, date: string) {
    return this.getAppointments(orgId, { date, limit: 100 });
  }

  /**
   * Gets a single appointment with full relations.
   */
  async getAppointment(orgId: string, appointmentId: string) {
    const [appointment] = await db
      .select()
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.id, appointmentId),
          eq(schema.appointments.orgId, orgId),
        ),
      )
      .limit(1);

    if (!appointment) return null;

    // Load customer
    let customer = null;
    if (appointment.customerId) {
      const [cust] = await db
        .select()
        .from(schema.customers)
        .where(
          and(
            eq(schema.customers.id, appointment.customerId),
            eq(schema.customers.orgId, orgId),
          ),
        )
        .limit(1);
      customer = cust ?? null;
    }

    // Load lead
    let lead = null;
    if (appointment.leadId) {
      const [l] = await db
        .select()
        .from(schema.leads)
        .where(
          and(
            eq(schema.leads.id, appointment.leadId),
            eq(schema.leads.orgId, orgId),
          ),
        )
        .limit(1);
      lead = l ?? null;
    }

    // Load technicians
    let technicians: unknown[] = [];
    if (appointment.assignedTechnicians && appointment.assignedTechnicians.length > 0) {
      technicians = await db
        .select({
          id: schema.technicians.id,
          firstName: schema.technicians.firstName,
          lastName: schema.technicians.lastName,
          email: schema.technicians.email,
          phone: schema.technicians.phone,
          color: schema.technicians.color,
        })
        .from(schema.technicians)
        .where(
          and(
            eq(schema.technicians.orgId, orgId),
            ...appointment.assignedTechnicians.map((id) => eq(schema.technicians.id, id)),
          ),
        );
    }

    return {
      ...appointment,
      customer,
      lead,
      technicians,
    };
  }
}

// ---- Singleton exports ----

let defaultAvailability: AvailabilityManager | null = null;
let defaultBooking: BookingService | null = null;

export function getAvailabilityManager(): AvailabilityManager {
  if (!defaultAvailability) {
    defaultAvailability = new AvailabilityManager();
  }
  return defaultAvailability;
}

export function getBookingService(): BookingService {
  if (!defaultBooking) {
    defaultBooking = new BookingService();
  }
  return defaultBooking;
}
