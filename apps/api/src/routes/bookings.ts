// SitePilot AI — Booking & Calendar API Endpoints
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth, orgContext } from "../middleware/auth.js";
import { getAvailabilityManager, getBookingService } from "../services/calendar.js";
import { badRequest, notFound } from "../lib/errors.js";

const bookings = new Hono();

// ---- Schemas ----

const createAppointmentSchema = z.object({
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().max(50).optional(),
  customerEmail: z.string().email().max(255).optional(),
  serviceType: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:MM"),
  notes: z.string().max(2000).optional(),
  technicianId: z.string().uuid().optional(),
  title: z.string().max(500).optional(),
});

const updateAppointmentSchema = z.object({
  status: z.string().optional(),
  technicianId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  notes: z.string().max(2000).optional(),
  title: z.string().max(500).optional(),
});

const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  daysAhead: z.string().optional().transform((v) => (v ? parseInt(v) : 7)),
});

const appointmentsQuerySchema = z.object({
  date: z.string().optional(),
  technicianId: z.string().optional(),
  status: z.string().optional(),
  page: z.string().optional().transform((v) => (v ? parseInt(v) : 1)),
  limit: z.string().optional().transform((v) => (v ? parseInt(v) : 20)),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

// ---- Public endpoint: Get availability ----
// GET /api/v1/orgs/:orgId/availability
bookings.get("/availability", zValidator("query", availabilityQuerySchema), async (c) => {
  const orgId = c.req.param("orgId") as string;
  const { date, daysAhead } = c.req.valid("query");

  const availability = getAvailabilityManager();
  const slots = await availability.getAvailableSlots(orgId, date, daysAhead);

  return c.json({ data: { slots, count: slots.length } });
});

// ---- Protected: Create appointment ----
// POST /api/v1/orgs/:orgId/appointments
bookings.post("/appointments", requireAuth, orgContext, zValidator("json", createAppointmentSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  const bookingService = getBookingService();

  try {
    const appointment = await bookingService.createAppointment(user.orgId, body);
    return c.json({ data: appointment }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create appointment";

    if (message.startsWith("CONFLICT:")) {
      return c.json(
        { error: { code: "CONFLICT", message: message.replace("CONFLICT: ", "") } },
        409,
      );
    }

    if (message.startsWith("INVALID_DATE:")) {
      throw badRequest(message.replace("INVALID_DATE: ", ""));
    }

    throw badRequest(message);
  }
});

// ---- Protected: List appointments ----
// GET /api/v1/orgs/:orgId/appointments
bookings.get("/appointments", requireAuth, orgContext, zValidator("query", appointmentsQuerySchema), async (c) => {
  const user = c.get("user");
  const query = c.req.valid("query");

  const bookingService = getBookingService();
  const result = await bookingService.getAppointments(user.orgId, {
    date: query.date,
    technicianId: query.technicianId,
    status: query.status as any,
    page: query.page,
    limit: query.limit,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
  });

  return c.json(result);
});

// ---- Protected: Get single appointment ----
// GET /api/v1/orgs/:orgId/appointments/:id
bookings.get("/appointments/:id", requireAuth, orgContext, async (c) => {
  const user = c.get("user");
  const appointmentId = c.req.param("id") as string;

  const bookingService = getBookingService();
  const appointment = await bookingService.getAppointment(user.orgId, appointmentId);

  if (!appointment) throw notFound("Appointment not found");

  return c.json({ data: appointment });
});

// ---- Protected: Update appointment ----
// PATCH /api/v1/orgs/:orgId/appointments/:id
bookings.patch("/appointments/:id", requireAuth, orgContext, zValidator("json", updateAppointmentSchema), async (c) => {
  const user = c.get("user");
  const appointmentId = c.req.param("id") as string;
  const body = c.req.valid("json");

  const bookingService = getBookingService();

  try {
    const appointment = await bookingService.updateAppointment(appointmentId, user.orgId, {
      ...body,
      status: body.status as any,
    });

    if (!appointment) throw notFound("Appointment not found");

    return c.json({ data: appointment });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";

    if (message.startsWith("CONFLICT:")) {
      return c.json(
        { error: { code: "CONFLICT", message: message.replace("CONFLICT: ", "") } },
        409,
      );
    }

    if (message.startsWith("INVALID_DATE:")) {
      throw badRequest(message.replace("INVALID_DATE: ", ""));
    }

    throw err;
  }
});

// ---- Protected: Cancel appointment ----
// DELETE /api/v1/orgs/:orgId/appointments/:id
bookings.delete("/appointments/:id", requireAuth, orgContext, async (c) => {
  const user = c.get("user");
  const appointmentId = c.req.param("id") as string;

  const bookingService = getBookingService();
  const appointment = await bookingService.cancelAppointment(appointmentId, user.orgId);

  if (!appointment) throw notFound("Appointment not found");

  return c.json({ data: appointment });
});

export default bookings;
