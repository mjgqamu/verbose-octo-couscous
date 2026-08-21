import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth, orgContext } from "../middleware/auth.js";
import * as customersService from "../services/customers.js";
import { notFound, badRequest } from "../lib/errors.js";

const customers = new Hono();

// Apply auth to all routes
customers.use("*", requireAuth, orgContext);

// ---- Schemas ----
const listQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.string().optional().transform((v) => (v ? parseInt(v) : undefined)),
  cursor: z.string().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

const createCustomerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  company: z.string().max(255).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(50).optional(),
  phoneAlt: z.string().max(50).optional(),
  addressLine1: z.string().max(255).optional(),
  addressLine2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(2).optional(),
  source: z.string().max(50).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const updateCustomerSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  company: z.string().max(255).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(50).optional(),
  phoneAlt: z.string().max(50).optional(),
  addressLine1: z.string().max(255).optional(),
  addressLine2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(2).optional(),
  source: z.string().max(50).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

// GET /api/v1/orgs/:orgId/customers
customers.get("/", zValidator("query", listQuerySchema), async (c) => {
  const user = c.get("user");
  const query = c.req.valid("query");

  const result = await customersService.listCustomers({
    orgId: user.orgId,
    search: query.search,
    limit: query.limit ?? 20,
    cursor: query.cursor,
    sortBy: query.sortBy,
    sortDir: query.sortDir ?? "desc",
  });

  return c.json(result);
});

// GET /api/v1/orgs/:orgId/customers/:id
customers.get("/:id", async (c) => {
  const user = c.get("user");
  const customerId = c.req.param("id");

  const customer = await customersService.getCustomer(user.orgId, customerId);
  if (!customer) throw notFound("Customer not found");

  return c.json({ data: customer });
});

// POST /api/v1/orgs/:orgId/customers
customers.post("/", zValidator("json", createCustomerSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json") as z.infer<typeof createCustomerSchema>;

  const customer = await customersService.createCustomer({
    orgId: user.orgId,
    ...body,
  });

  if (!customer) throw badRequest("Failed to create customer");

  return c.json({ data: customer }, 201);
});

// PATCH /api/v1/orgs/:orgId/customers/:id
customers.patch("/:id", zValidator("json", updateCustomerSchema), async (c) => {
  const user = c.get("user");
  const customerId = c.req.param("id");
  const body = c.req.valid("json");

  const customer = await customersService.updateCustomer(user.orgId, customerId, body);
  if (!customer) throw notFound("Customer not found");

  return c.json({ data: customer });
});

// DELETE /api/v1/orgs/:orgId/customers/:id
customers.delete("/:id", async (c) => {
  const user = c.get("user");
  const customerId = c.req.param("id");

  const customer = await customersService.deleteCustomer(user.orgId, customerId);
  if (!customer) throw notFound("Customer not found");

  return c.json({ data: customer });
});

export default customers;
