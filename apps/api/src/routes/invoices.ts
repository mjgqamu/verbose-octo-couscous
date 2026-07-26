// SitePilot AI — Invoice API Routes
// All endpoints under /api/v1/orgs/:orgId/invoices
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth, orgContext, requireRole } from "../middleware/auth.js";
import { getInvoiceManager } from "../services/invoices.js";
import { notFound, badRequest } from "../lib/errors.js";

const invoices = new Hono();
const invoiceManager = getInvoiceManager();

// Apply auth + org context to all routes
invoices.use("*", requireAuth, orgContext);

// ---- Schemas ----

const lineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().min(0.01),
  unit: z.string().max(50).optional().default("ea"),
  unitPrice: z.number().min(0),
  sortOrder: z.number().int().optional(),
});

const createInvoiceSchema = z.object({
  customerId: z.string().uuid(),
  quoteId: z.string().uuid().optional(),
  jobId: z.string().uuid().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  dueDate: z.string().min(1),
  notes: z.string().optional(),
  terms: z.string().optional(),
  taxRate: z.number().min(0).max(1).optional().default(0),
  discountAmount: z.number().min(0).optional().default(0),
});

const updateInvoiceSchema = z.object({
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  dueDate: z.string().optional(),
});

const recordPaymentSchema = z.object({
  amount: z.number().positive("Payment amount must be positive"),
  method: z.string().min(1).max(50),
  transactionId: z.string().max(255).optional(),
  notes: z.string().optional(),
  paidAt: z.string().optional(),
});

const listQuerySchema = z.object({
  status: z.string().optional(),
  customerId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  limit: z.string().optional().transform((v) => (v ? parseInt(v) : undefined)),
  cursor: z.string().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

// ---- Role guard middleware ----
function requireInvoiceAccess() {
  return requireRole("business_owner", "office_admin");
}

// ---- GET /api/v1/orgs/:orgId/invoices/stats (must be before /:id) ----
invoices.get("/stats", requireInvoiceAccess(), async (c) => {
  const user = c.get("user");
  const stats = await invoiceManager.getInvoiceStats(user.orgId);
  return c.json({ data: stats });
});

// ---- GET /api/v1/orgs/:orgId/invoices ----
invoices.get("/", requireInvoiceAccess(), zValidator("query", listQuerySchema), async (c) => {
  const user = c.get("user");
  const query = c.req.valid("query");

  const result = await invoiceManager.getInvoices(user.orgId, {
    status: query.status,
    customerId: query.customerId,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    search: query.search,
    limit: query.limit ?? 20,
    cursor: query.cursor,
    sortBy: query.sortBy,
    sortDir: query.sortDir ?? "desc",
  });

  return c.json(result);
});

// ---- GET /api/v1/orgs/:orgId/invoices/:id ----
invoices.get("/:id", requireInvoiceAccess(), async (c) => {
  const user = c.get("user");
  const invoiceId = c.req.param("id")!;

  const invoice = await invoiceManager.getInvoice(user.orgId, invoiceId);
  if (!invoice) throw notFound("Invoice not found");

  return c.json({ data: invoice });
});

// ---- POST /api/v1/orgs/:orgId/invoices ----
invoices.post("/", requireInvoiceAccess(), zValidator("json", createInvoiceSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  try {
    const invoice = await invoiceManager.createInvoice(user.orgId, body);
    if (!invoice) throw badRequest("Failed to create invoice");

    return c.json({ data: invoice }, 201);
  } catch (err) {
    if (err instanceof Error) {
      throw badRequest(err.message);
    }
    throw err;
  }
});

// ---- PATCH /api/v1/orgs/:orgId/invoices/:id ----
invoices.patch("/:id", requireInvoiceAccess(), zValidator("json", updateInvoiceSchema), async (c) => {
  const user = c.get("user");
  const invoiceId = c.req.param("id")!;
  const body = c.req.valid("json");

  if (body.status) {
    const invoice = await invoiceManager.updateInvoiceStatus(user.orgId, invoiceId, body.status);
    if (!invoice) throw notFound("Invoice not found");
    return c.json({ data: invoice });
  }

  // Other updates (notes, terms, dueDate) could be added here
  // For now, just return the current invoice
  const invoice = await invoiceManager.getInvoice(user.orgId, invoiceId);
  if (!invoice) throw notFound("Invoice not found");
  return c.json({ data: invoice });
});

// ---- POST /api/v1/orgs/:orgId/invoices/:id/payments ----
invoices.post("/:id/payments", requireInvoiceAccess(), zValidator("json", recordPaymentSchema), async (c) => {
  const user = c.get("user");
  const invoiceId = c.req.param("id")!;
  const body = c.req.valid("json");

  try {
    const payment = await invoiceManager.recordPayment(user.orgId, invoiceId, body);
    if (!payment) throw badRequest("Failed to record payment");

    return c.json({ data: payment }, 201);
  } catch (err) {
    if (err instanceof Error) {
      throw badRequest(err.message);
    }
    throw err;
  }
});

// ---- POST /api/v1/orgs/:orgId/invoices/:id/send ----
invoices.post("/:id/send", requireInvoiceAccess(), async (c) => {
  const user = c.get("user");
  const invoiceId = c.req.param("id")!;

  const invoice = await invoiceManager.updateInvoiceStatus(user.orgId!, invoiceId, "sent");
  if (!invoice) throw notFound("Invoice not found");

  return c.json({ data: invoice });
});

export default invoices;
