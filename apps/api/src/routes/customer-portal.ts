// SitePilot AI — Customer Portal API Routes
// All endpoints under /api/v1/orgs/:orgId/customer
// Protected: requireAuth + requireRole('customer')
import { Hono } from "hono";
import { requireAuth, orgContext } from "../middleware/auth.js";
import { requireRole } from "../middleware/auth.js";
import {
  resolveCustomer,
  getCustomerQuotes,
  getCustomerQuote,
  approveQuote,
  declineQuote,
  getCustomerAppointments,
  getCustomerJobs,
  getCustomerJob,
  getCustomerInvoices,
} from "../services/customer-portal.js";
import { notFound, badRequest, forbidden } from "../lib/errors.js";

const customerPortal = new Hono();

// All routes require auth and customer role
customerPortal.use("*", requireAuth, orgContext, requireRole("customer"));

// ---- Helper: resolve customerId from JWT user ----
async function resolveCustomerFromAuth(c: import("hono").Context) {
  const user = c.get("user");
  const orgId = c.req.param("orgId");

  // Ensure the user belongs to this org
  if (user.orgId !== orgId) {
    throw forbidden("Access denied to this organization");
  }

  const customer = await resolveCustomer(orgId, user.email);
  if (!customer) {
    throw notFound("Customer record not found. Please contact your service provider.");
  }

  return { customer, user };
}

// ---- GET /api/v1/orgs/:orgId/customer/me ----
customerPortal.get("/me", async (c) => {
  const { customer } = await resolveCustomerFromAuth(c);
  return c.json({ data: customer });
});

// ---- GET /api/v1/orgs/:orgId/customer/quotes ----
customerPortal.get("/quotes", async (c) => {
  const { customer } = await resolveCustomerFromAuth(c);
  const quotes = await getCustomerQuotes(customer.orgId, customer.id);
  return c.json({ data: quotes });
});

// ---- GET /api/v1/orgs/:orgId/customer/quotes/:id ----
customerPortal.get("/quotes/:id", async (c) => {
  const { customer } = await resolveCustomerFromAuth(c);
  const quoteId = c.req.param("id") as string;

  const quote = await getCustomerQuote(customer.orgId, customer.id, quoteId);
  if (!quote) throw notFound("Quote not found");

  return c.json({ data: quote });
});

// ---- POST /api/v1/orgs/:orgId/customer/quotes/:id/approve ----
customerPortal.post("/quotes/:id/approve", async (c) => {
  const { customer } = await resolveCustomerFromAuth(c);
  const quoteId = c.req.param("id") as string;

  const quote = await approveQuote(customer.orgId, customer.id, quoteId);
  if (!quote) {
    // Could be not found, or already accepted/declined/expired
    throw badRequest("Quote cannot be approved. It may have already been accepted, declined, or expired.");
  }

  return c.json({ data: quote });
});

// ---- POST /api/v1/orgs/:orgId/customer/quotes/:id/decline ----
customerPortal.post("/quotes/:id/decline", async (c) => {
  const { customer } = await resolveCustomerFromAuth(c);
  const quoteId = c.req.param("id") as string;

  const quote = await declineQuote(customer.orgId, customer.id, quoteId);
  if (!quote) {
    throw badRequest("Quote cannot be declined. It may have already been accepted, declined, or expired.");
  }

  return c.json({ data: quote });
});

// ---- GET /api/v1/orgs/:orgId/customer/appointments ----
customerPortal.get("/appointments", async (c) => {
  const { customer } = await resolveCustomerFromAuth(c);
  const appointments = await getCustomerAppointments(customer.orgId, customer.id);
  return c.json({ data: appointments });
});

// ---- GET /api/v1/orgs/:orgId/customer/jobs ----
customerPortal.get("/jobs", async (c) => {
  const { customer } = await resolveCustomerFromAuth(c);
  const jobs = await getCustomerJobs(customer.orgId, customer.id);
  return c.json({ data: jobs });
});

// ---- GET /api/v1/orgs/:orgId/customer/jobs/:id ----
customerPortal.get("/jobs/:id", async (c) => {
  const { customer } = await resolveCustomerFromAuth(c);
  const jobId = c.req.param("id") as string;

  const job = await getCustomerJob(customer.orgId, customer.id, jobId);
  if (!job) throw notFound("Job not found");

  return c.json({ data: job });
});

// ---- GET /api/v1/orgs/:orgId/customer/invoices ----
customerPortal.get("/invoices", async (c) => {
  const { customer } = await resolveCustomerFromAuth(c);
  const invoices = await getCustomerInvoices(customer.orgId, customer.id);
  return c.json({ data: invoices });
});

export default customerPortal;
