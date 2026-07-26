import { db, schema, eq, and, isNull, desc, asc, count, sql, gt, lt } from "@sitepilot/db";

// ---- Types ----
export interface ListCustomersParams {
  orgId: string;
  search?: string;
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface CreateCustomerParams {
  orgId: string;
  firstName: string;
  lastName: string;
  company?: string;
  email?: string;
  phone?: string;
  phoneAlt?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  source?: string;
  tags?: string[];
  notes?: string;
}

export interface UpdateCustomerParams {
  firstName?: string;
  lastName?: string;
  company?: string;
  email?: string;
  phone?: string;
  phoneAlt?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  source?: string;
  tags?: string[];
  notes?: string;
}

// ---- Customer CRUD ----
export async function listCustomers(params: ListCustomersParams) {
  const {
    orgId,
    search,
    limit = 20,
    cursor,
    sortBy = "created_at",
    sortDir = "desc",
  } = params;

  const conditions = [
    eq(schema.customers.orgId, orgId),
    isNull(schema.customers.deletedAt),
  ];

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      sql`(${schema.customers.firstName} ILIKE ${pattern} OR ${schema.customers.lastName} ILIKE ${pattern} OR ${schema.customers.company} ILIKE ${pattern} OR ${schema.customers.email} ILIKE ${pattern} OR ${schema.customers.phone} ILIKE ${pattern})`
    );
  }

  if (cursor) {
    if (sortDir === "desc") {
      conditions.push(lt(schema.customers.createdAt, new Date(cursor)));
    } else {
      conditions.push(gt(schema.customers.createdAt, new Date(cursor)));
    }
  }

  const orderCol = sortBy === "created_at"
    ? schema.customers.createdAt
    : sortBy === "last_name"
      ? schema.customers.lastName
      : sortBy === "lifetime_value"
        ? schema.customers.lifetimeValue
        : schema.customers.createdAt;

  const orderFn = sortDir === "asc" ? asc : desc;

  const rows = await db
    .select()
    .from(schema.customers)
    .where(and(...conditions))
    .orderBy(orderFn(orderCol))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = data[data.length - 1];

  const [totalRow] = await db
    .select({ total: count() })
    .from(schema.customers)
    .where(and(eq(schema.customers.orgId, orgId), isNull(schema.customers.deletedAt)));

  return {
    data,
    pagination: {
      cursor: lastRow?.createdAt?.toISOString() ?? null,
      hasMore,
      total: totalRow?.total ?? 0,
    },
  };
}

export async function getCustomer(orgId: string, customerId: string) {
  const [customer] = await db
    .select()
    .from(schema.customers)
    .where(and(eq(schema.customers.id, customerId), eq(schema.customers.orgId, orgId), isNull(schema.customers.deletedAt)))
    .limit(1);

  if (!customer) return null;

  // Load related leads
  const leads = await db
    .select()
    .from(schema.leads)
    .where(and(eq(schema.leads.customerId, customerId), eq(schema.leads.orgId, orgId), isNull(schema.leads.deletedAt)))
    .orderBy(desc(schema.leads.createdAt))
    .limit(20);

  // Load related jobs
  const jobs = await db
    .select()
    .from(schema.jobs)
    .where(and(eq(schema.jobs.customerId, customerId), eq(schema.jobs.orgId, orgId)))
    .orderBy(desc(schema.jobs.createdAt))
    .limit(20);

  // Load related quotes
  const quotes = await db
    .select()
    .from(schema.quotes)
    .where(and(eq(schema.quotes.customerId, customerId), eq(schema.quotes.orgId, orgId)))
    .orderBy(desc(schema.quotes.createdAt))
    .limit(20);

  // Load related invoices
  const invoices = await db
    .select()
    .from(schema.invoices)
    .where(and(eq(schema.invoices.customerId, customerId), eq(schema.invoices.orgId, orgId)))
    .orderBy(desc(schema.invoices.createdAt))
    .limit(20);

  // Load conversations
  const conversations = await db
    .select()
    .from(schema.conversations)
    .where(and(eq(schema.conversations.customerId, customerId), eq(schema.conversations.orgId, orgId)))
    .orderBy(desc(schema.conversations.lastMessageAt))
    .limit(20);

  // Load calls
  const calls = await db
    .select()
    .from(schema.calls)
    .where(and(eq(schema.calls.customerId, customerId), eq(schema.calls.orgId, orgId)))
    .orderBy(desc(schema.calls.startedAt))
    .limit(20);

  return {
    ...customer,
    leads,
    jobs,
    quotes,
    invoices,
    conversations,
    calls,
  };
}

export async function createCustomer(params: CreateCustomerParams) {
  const [customer] = await db
    .insert(schema.customers)
    .values({
      orgId: params.orgId,
      firstName: params.firstName,
      lastName: params.lastName,
      company: params.company ?? null,
      email: params.email ?? null,
      phone: params.phone ?? null,
      phoneAlt: params.phoneAlt ?? null,
      addressLine1: params.addressLine1 ?? null,
      addressLine2: params.addressLine2 ?? null,
      city: params.city ?? null,
      state: params.state ?? null,
      postalCode: params.postalCode ?? null,
      country: params.country ?? "US",
      source: params.source ?? null,
      tags: params.tags ?? [],
      notes: params.notes ?? null,
    })
    .returning();

  return customer ?? null;
}

export async function updateCustomer(orgId: string, customerId: string, params: UpdateCustomerParams) {
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (params.firstName !== undefined) updates.firstName = params.firstName;
  if (params.lastName !== undefined) updates.lastName = params.lastName;
  if (params.company !== undefined) updates.company = params.company;
  if (params.email !== undefined) updates.email = params.email;
  if (params.phone !== undefined) updates.phone = params.phone;
  if (params.phoneAlt !== undefined) updates.phoneAlt = params.phoneAlt;
  if (params.addressLine1 !== undefined) updates.addressLine1 = params.addressLine1;
  if (params.addressLine2 !== undefined) updates.addressLine2 = params.addressLine2;
  if (params.city !== undefined) updates.city = params.city;
  if (params.state !== undefined) updates.state = params.state;
  if (params.postalCode !== undefined) updates.postalCode = params.postalCode;
  if (params.country !== undefined) updates.country = params.country;
  if (params.source !== undefined) updates.source = params.source;
  if (params.tags !== undefined) updates.tags = params.tags;
  if (params.notes !== undefined) updates.notes = params.notes;

  const [customer] = await db
    .update(schema.customers)
    .set(updates)
    .where(and(eq(schema.customers.id, customerId), eq(schema.customers.orgId, orgId)))
    .returning();

  return customer ?? null;
}

export async function deleteCustomer(orgId: string, customerId: string) {
  const [customer] = await db
    .update(schema.customers)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.customers.id, customerId), eq(schema.customers.orgId, orgId)))
    .returning();

  return customer ?? null;
}
