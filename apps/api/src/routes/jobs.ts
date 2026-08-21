import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth, orgContext } from "../middleware/auth.js";
import { getJobManager } from "../services/jobs.js";
import { notFound, badRequest } from "../lib/errors.js";

const jobs = new Hono();
const jobManager = getJobManager();

// Apply auth to all routes
jobs.use("*", requireAuth, orgContext);

// ---- Schemas ----

const listQuerySchema = z.object({
  status: z.string().optional(),
  technicianId: z.string().optional(),
  customerId: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.string().optional().transform((v) => (v ? parseInt(v) : undefined)),
  cursor: z.string().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

const createJobSchema = z.object({
  customerId: z.string().uuid(),
  leadId: z.string().uuid().optional(),
  quoteId: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  serviceType: z.string().max(200).optional(),
  priority: z.number().int().min(0).max(10).optional(),
  scheduledStart: z.string().optional(),
  scheduledEnd: z.string().optional(),
  technicianId: z.string().uuid().optional(),
  addressLine1: z.string().max(255).optional(),
  addressLine2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateJobSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  status: z.string().max(50).optional(),
  priority: z.number().int().min(0).max(10).optional(),
  serviceType: z.string().max(200).optional(),
  scheduledStart: z.string().optional(),
  scheduledEnd: z.string().optional(),
  technicianId: z.string().uuid().nullable().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  cancelReason: z.string().max(500).optional(),
});

const assignTechnicianSchema = z.object({
  technicianId: z.string().uuid(),
});

const addActivitySchema = z.object({
  activityType: z.string().min(1).max(50),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const addPhotoSchema = z.object({
  url: z.string().min(1),
  caption: z.string().max(500).optional(),
  photoType: z.enum(["before", "after", "progress"]).optional(),
});

// ---- Stats (must be before /:id routes) ----
jobs.get("/stats", async (c) => {
  const user = c.get("user");
  const stats = await jobManager.getJobStats(user.orgId);

  // Tech-only: include their personal stats
  let techStats = null;
  if (user.role === "technician") {
    techStats = await jobManager.getTechnicianTodayJobs(user.orgId, user.id);
  }

  return c.json({ data: { ...stats, techStats } });
});

// ---- GET /api/v1/orgs/:orgId/jobs ----
jobs.get("/", zValidator("query", listQuerySchema), async (c) => {
  const user = c.get("user");
  const query = c.req.valid("query");

  // Technicians can only see their own jobs
  const filters = {
    orgId: user.orgId,
    status: query.status,
    customerId: query.customerId,
    search: query.search,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    limit: query.limit ?? 20,
    cursor: query.cursor,
    sortBy: query.sortBy,
    sortDir: query.sortDir ?? "desc",
    technicianId: user.role === "technician" ? user.id : query.technicianId,
  };

  const result = await jobManager.getJobs(user.orgId, filters);
  return c.json(result);
});

// ---- GET /api/v1/orgs/:orgId/jobs/:id ----
jobs.get("/:id", async (c) => {
  const user = c.get("user");
  const jobId = c.req.param("id");

  const job = await jobManager.getJob(user.orgId, jobId);
  if (!job) throw notFound("Job not found");

  // Techs can only see their own jobs
  if (user.role === "technician") {
    const isAssigned = job.assignedTechs?.includes(user.id);
    if (!isAssigned) throw notFound("Job not found");
  }

  return c.json({ data: job });
});

// ---- POST /api/v1/orgs/:orgId/jobs ----
jobs.post("/", zValidator("json", createJobSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json") as z.infer<typeof createJobSchema>;

  const job = await jobManager.createJob(user.orgId, { ...body });
  if (!job) throw badRequest("Failed to create job");

  // Auto-log creation activity
  await jobManager.addJobActivity(user.orgId, job.id, {
    userId: user.id,
    activityType: "job_created",
    description: `Job #${job.number} created`,
  });

  return c.json({ data: job }, 201);
});

// ---- PATCH /api/v1/orgs/:orgId/jobs/:id ----
jobs.patch("/:id", zValidator("json", updateJobSchema), async (c) => {
  const user = c.get("user");
  const jobId = c.req.param("id");
  const body = c.req.valid("json");

  try {
    const job = await jobManager.updateJob(user.orgId, jobId, body);
    if (!job) throw notFound("Job not found");

    // Log status change as activity
    if (body.status) {
      await jobManager.addJobActivity(user.orgId, jobId, {
        userId: user.id,
        activityType: "status_change",
        description: `Status changed to ${body.status.replace(/_/g, " ")}`,
        metadata: { previousStatus: null, newStatus: body.status },
      });
    }

    return c.json({ data: job });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Invalid status transition")) {
      throw badRequest(err.message);
    }
    throw err;
  }
});

// ---- PATCH /api/v1/orgs/:orgId/jobs/:id/assign ----
jobs.patch("/:id/assign", zValidator("json", assignTechnicianSchema), async (c) => {
  const user = c.get("user");
  const jobId = c.req.param("id");
  const body = c.req.valid("json");

  const job = await jobManager.assignTechnician(user.orgId, jobId, body.technicianId);
  if (!job) throw notFound("Job not found");

  // Log assignment
  await jobManager.addJobActivity(user.orgId, jobId, {
    userId: user.id,
    activityType: "technician_assigned",
    description: `Technician assigned`,
    metadata: { technicianId: body.technicianId },
  });

  return c.json({ data: job });
});

// ---- POST /api/v1/orgs/:orgId/jobs/:id/activities ----
jobs.post("/:id/activities", zValidator("json", addActivitySchema), async (c) => {
  const user = c.get("user");
  const jobId = c.req.param("id");
  const body = c.req.valid("json");

  // Verify job exists
  const job = await jobManager.getJob(user.orgId, jobId);
  if (!job) throw notFound("Job not found");

  const activity = await jobManager.addJobActivity(user.orgId, jobId, {
    userId: user.id,
    activityType: body.activityType,
    description: body.description,
    metadata: body.metadata as Record<string, unknown> | undefined,
  });

  if (!activity) throw badRequest("Failed to add activity");

  return c.json({ data: activity }, 201);
});

// ---- POST /api/v1/orgs/:orgId/jobs/:id/photos ----
jobs.post("/:id/photos", zValidator("json", addPhotoSchema), async (c) => {
  const user = c.get("user");
  const jobId = c.req.param("id");
  const body = c.req.valid("json");

  // Verify job exists
  const job = await jobManager.getJob(user.orgId, jobId);
  if (!job) throw notFound("Job not found");

  const photo = await jobManager.addJobPhoto(user.orgId, jobId, {
    userId: user.id,
    url: body.url,
    caption: body.caption,
    photoType: body.photoType,
  });

  if (!photo) throw badRequest("Failed to add photo");

  return c.json({ data: photo }, 201);
});

export default jobs;
