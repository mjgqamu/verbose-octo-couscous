// SitePilot AI — Customer Portal Service
// All queries are scoped to (orgId, customerId) for multi-tenant safety.
import { db, schema, eq, and, isNull, desc, inArray } from "@sitepilot/db";

// ---- Types ----

export interface CustomerPortalCustomer {
  id: string;
  orgId: string;
  firstName: string;
  lastName: string;
  company: string | null;
  email: string | null;
  phone: string | null;
}

// ---- Helpers ----

/**
 * Resolve a customer record from the user's JWT identity.
 * Customer users (role='customer') are matched to the customers table
 * by email within the same organization.
 */
export async function resolveCustomer(
  orgId: string,
  email: string,
): Promise<CustomerPortalCustomer | null> {
  const [customer] = await db
    .select({
      id: schema.customers.id,
      orgId: schema.customers.orgId,
      firstName: schema.customers.firstName,
      lastName: schema.customers.lastName,
      company: schema.customers.company,
      email: schema.customers.email,
      phone: schema.customers.phone,
    })
    .from(schema.customers)
    .where(
      and(
        eq(schema.customers.orgId, orgId),
        eq(schema.customers.email, email.toLowerCase()),
        isNull(schema.customers.deletedAt),
      ),
    )
    .limit(1);

  return customer ?? null;
}

// ---- Quotes ----

export async function getCustomerQuotes(
  orgId: string,
  customerId: string,
) {
  const rows = await db
    .select({
      id: schema.quotes.id,
      number: schema.quotes.number,
      status: schema.quotes.status,
      title: schema.quotes.title,
      description: schema.quotes.description,
      subtotal: schema.quotes.subtotal,
      discountAmount: schema.quotes.discountAmount,
      discountPercent: schema.quotes.discountPercent,
      taxRate: schema.quotes.taxRate,
      taxAmount: schema.quotes.taxAmount,
      total: schema.quotes.total,
      currency: schema.quotes.currency,
      validUntil: schema.quotes.validUntil,
      sentAt: schema.quotes.sentAt,
      viewedAt: schema.quotes.viewedAt,
      acceptedAt: schema.quotes.acceptedAt,
      declinedAt: schema.quotes.declinedAt,
      createdAt: schema.quotes.createdAt,
      updatedAt: schema.quotes.updatedAt,
    })
    .from(schema.quotes)
    .where(
      and(
        eq(schema.quotes.orgId, orgId),
        eq(schema.quotes.customerId, customerId),
        isNull(schema.quotes.deletedAt),
      ),
    )
    .orderBy(desc(schema.quotes.createdAt));

  return rows;
}

export async function getCustomerQuote(
  orgId: string,
  customerId: string,
  quoteId: string,
) {
  const [quote] = await db
    .select()
    .from(schema.quotes)
    .where(
      and(
        eq(schema.quotes.id, quoteId),
        eq(schema.quotes.orgId, orgId),
        eq(schema.quotes.customerId, customerId),
        isNull(schema.quotes.deletedAt),
      ),
    )
    .limit(1);

  if (!quote) return null;

  // Fetch line items
  const lineItems = await db
    .select()
    .from(schema.quoteLineItems)
    .where(
      and(
        eq(schema.quoteLineItems.quoteId, quoteId),
        eq(schema.quoteLineItems.orgId, orgId),
      ),
    )
    .orderBy(schema.quoteLineItems.sortOrder);

  return { ...quote, lineItems };
}

export async function approveQuote(
  orgId: string,
  customerId: string,
  quoteId: string,
) {
  const now = new Date();

  const [quote] = await db
    .update(schema.quotes)
    .set({
      status: "accepted",
      acceptedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(schema.quotes.id, quoteId),
        eq(schema.quotes.orgId, orgId),
        eq(schema.quotes.customerId, customerId),
        // Only allow approval from 'sent' or 'viewed' statuses
        inArray(schema.quotes.status, ["sent", "viewed"]),
        isNull(schema.quotes.deletedAt),
      ),
    )
    .returning();

  return quote ?? null;
}

export async function declineQuote(
  orgId: string,
  customerId: string,
  quoteId: string,
) {
  const now = new Date();

  const [quote] = await db
    .update(schema.quotes)
    .set({
      status: "declined",
      declinedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(schema.quotes.id, quoteId),
        eq(schema.quotes.orgId, orgId),
        eq(schema.quotes.customerId, customerId),
        // Only allow decline from 'sent' or 'viewed' statuses
        inArray(schema.quotes.status, ["sent", "viewed"]),
        isNull(schema.quotes.deletedAt),
      ),
    )
    .returning();

  return quote ?? null;
}

// ---- Appointments ----

export async function getCustomerAppointments(
  orgId: string,
  customerId: string,
) {
  const rows = await db
    .select()
    .from(schema.appointments)
    .where(
      and(
        eq(schema.appointments.orgId, orgId),
        eq(schema.appointments.customerId, customerId),
      ),
    )
    .orderBy(desc(schema.appointments.scheduledStart));

  return rows;
}

// ---- Jobs ----

export async function getCustomerJobs(
  orgId: string,
  customerId: string,
) {
  const rows = await db
    .select({
      id: schema.jobs.id,
      orgId: schema.jobs.orgId,
      number: schema.jobs.number,
      title: schema.jobs.title,
      description: schema.jobs.description,
      status: schema.jobs.status,
      priority: schema.jobs.priority,
      serviceType: schema.jobs.serviceType,
      scheduledStart: schema.jobs.scheduledStart,
      scheduledEnd: schema.jobs.scheduledEnd,
      actualStart: schema.jobs.actualStart,
      actualEnd: schema.jobs.actualEnd,
      estimatedHours: schema.jobs.estimatedHours,
      actualHours: schema.jobs.actualHours,
      notes: schema.jobs.notes,
      tags: schema.jobs.tags,
      completedAt: schema.jobs.completedAt,
      cancelledAt: schema.jobs.cancelledAt,
      createdAt: schema.jobs.createdAt,
      updatedAt: schema.jobs.updatedAt,
    })
    .from(schema.jobs)
    .where(
      and(
        eq(schema.jobs.orgId, orgId),
        eq(schema.jobs.customerId, customerId),
        isNull(schema.jobs.deletedAt),
      ),
    )
    .orderBy(desc(schema.jobs.createdAt));

  return rows;
}

export async function getCustomerJob(
  orgId: string,
  customerId: string,
  jobId: string,
) {
  const [job] = await db
    .select()
    .from(schema.jobs)
    .where(
      and(
        eq(schema.jobs.id, jobId),
        eq(schema.jobs.orgId, orgId),
        eq(schema.jobs.customerId, customerId),
        isNull(schema.jobs.deletedAt),
      ),
    )
    .limit(1);

  if (!job) return null;

  // Fetch activities
  const activities = await db
    .select()
    .from(schema.jobActivities)
    .where(
      and(
        eq(schema.jobActivities.jobId, jobId),
        eq(schema.jobActivities.orgId, orgId),
      ),
    )
    .orderBy(desc(schema.jobActivities.createdAt))
    .limit(50);

  // Fetch photos
  const photos = await db
    .select()
    .from(schema.jobPhotos)
    .where(
      and(
        eq(schema.jobPhotos.jobId, jobId),
        eq(schema.jobPhotos.orgId, orgId),
      ),
    )
    .orderBy(desc(schema.jobPhotos.createdAt));

  return { ...job, activities, photos };
}

// ---- Invoices ----

export async function getCustomerInvoices(
  orgId: string,
  customerId: string,
) {
  const rows = await db
    .select({
      id: schema.invoices.id,
      number: schema.invoices.number,
      status: schema.invoices.status,
      subtotal: schema.invoices.subtotal,
      discountAmount: schema.invoices.discountAmount,
      taxRate: schema.invoices.taxRate,
      taxAmount: schema.invoices.taxAmount,
      total: schema.invoices.total,
      amountPaid: schema.invoices.amountPaid,
      balanceDue: schema.invoices.balanceDue,
      currency: schema.invoices.currency,
      dueDate: schema.invoices.dueDate,
      issuedAt: schema.invoices.issuedAt,
      paidAt: schema.invoices.paidAt,
      notes: schema.invoices.notes,
      pdfUrl: schema.invoices.pdfUrl,
      createdAt: schema.invoices.createdAt,
      updatedAt: schema.invoices.updatedAt,
    })
    .from(schema.invoices)
    .where(
      and(
        eq(schema.invoices.orgId, orgId),
        eq(schema.invoices.customerId, customerId),
        isNull(schema.invoices.deletedAt),
      ),
    )
    .orderBy(desc(schema.invoices.createdAt));

  return rows;
}
