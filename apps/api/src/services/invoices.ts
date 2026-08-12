// SitePilot AI — Invoice Service
// Multi-tenant invoice management with payments.
import { db, schema, eq, and, or, iLike, isNull, desc, asc, sql, count, sum, lt, gt, gte } from "@sitepilot/db";

// ---- Types ----

export interface InvoiceLineItemData {
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  sortOrder?: number;
}

export interface CreateInvoiceData {
  customerId: string;
  quoteId?: string;
  jobId?: string;
  lineItems: InvoiceLineItemData[];
  dueDate: string;
  notes?: string;
  terms?: string;
  taxRate?: number;
  discountAmount?: number;
}

export interface RecordPaymentData {
  amount: number;
  method: string;
  transactionId?: string;
  notes?: string;
  paidAt?: string;
}

export interface ListInvoicesParams {
  status?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

// ---- Helpers ----

function generateInvoiceNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${date}-${rand}`;
}

// ---- InvoiceManager ----

export class InvoiceManager {
  // ---- CREATE ----
  async createInvoice(orgId: string, data: CreateInvoiceData) {
    const number = generateInvoiceNumber();

    // Calculate totals
    let subtotal = 0;
    for (const item of data.lineItems) {
      subtotal += item.quantity * item.unitPrice;
    }

    const discountAmount = data.discountAmount ?? 0;
    const afterDiscount = subtotal - discountAmount;
    const taxRate = data.taxRate ?? 0;
    const taxAmount = Math.round(afterDiscount * taxRate * 100) / 100;
    const total = afterDiscount + taxAmount;

    const dueDate = new Date(data.dueDate);

    const [invoice] = await db
      .insert(schema.invoices)
      .values({
        orgId,
        number,
        customerId: data.customerId,
        jobId: data.jobId ?? null,
        quoteId: data.quoteId ?? null,
        status: "draft",
        subtotal: String(subtotal),
        discountAmount: String(discountAmount),
        taxRate: String(taxRate),
        taxAmount: String(taxAmount),
        total: String(total),
        amountPaid: "0",
        balanceDue: String(total),
        currency: "USD",
        dueDate,
        issuedAt: null,
        notes: data.notes ?? null,
        terms: data.terms ?? null,
      })
      .returning();

    if (!invoice) return null;

    // Insert line items
    const lineItems = data.lineItems.map((item, idx) => ({
      orgId,
      invoiceId: invoice.id,
      description: item.description,
      quantity: String(item.quantity),
      unit: item.unit ?? "ea",
      unitPrice: String(item.unitPrice),
      total: String(Math.round(item.quantity * item.unitPrice * 100) / 100),
      sortOrder: item.sortOrder ?? idx,
    }));

    if (lineItems.length > 0) {
      await db.insert(schema.invoiceLineItems).values(lineItems);
    }

    // If linked to a quote, fetch quote line items for context
    let quote = null;
    if (data.quoteId) {
      const [qt] = await db
        .select({
          id: schema.quotes.id,
          number: schema.quotes.number,
          title: schema.quotes.title,
        })
        .from(schema.quotes)
        .where(and(eq(schema.quotes.id, data.quoteId), eq(schema.quotes.orgId, orgId)))
        .limit(1);
      quote = qt ?? null;
    }

    return { ...invoice, lineItems, quote };
  }

  // ---- LIST ----
  async getInvoices(orgId: string, filters: ListInvoicesParams) {
    const {
      status,
      customerId,
      dateFrom,
      dateTo,
      search,
      limit = 20,
      cursor,
      sortBy = "created_at",
      sortDir = "desc",
    } = filters;

    const conditions = [
      eq(schema.invoices.orgId, orgId),
      isNull(schema.invoices.deletedAt),
    ];

    if (status) {
      conditions.push(eq(schema.invoices.status, status));
    }

    if (customerId) {
      conditions.push(eq(schema.invoices.customerId, customerId));
    }

    if (dateFrom) {
      conditions.push(sql`${schema.invoices.createdAt} >= ${new Date(dateFrom).toISOString()}`);
    }
    if (dateTo) {
      conditions.push(sql`${schema.invoices.createdAt} <= ${new Date(dateTo).toISOString()}`);
    }

    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
        iLike(schema.invoices.number, pattern),
        iLike(schema.invoices.notes, pattern)
      )!,
      );
    }

    // Cursor pagination
    if (cursor) {
      const col = sortBy === "due_date" ? schema.invoices.dueDate : schema.invoices.createdAt;
      if (sortDir === "desc") {
        conditions.push(lt(col, new Date(cursor)));
      } else {
        conditions.push(gt(col, new Date(cursor)));
      }
    }

    const orderCol =
      sortBy === "due_date"
        ? schema.invoices.dueDate
        : sortBy === "total"
          ? schema.invoices.total
          : schema.invoices.createdAt;

    const orderFn = sortDir === "asc" ? asc : desc;

    const rows = await db
      .select({
        id: schema.invoices.id,
        orgId: schema.invoices.orgId,
        number: schema.invoices.number,
        customerId: schema.invoices.customerId,
        jobId: schema.invoices.jobId,
        quoteId: schema.invoices.quoteId,
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
        sentAt: schema.invoices.sentAt,
        notes: schema.invoices.notes,
        createdAt: schema.invoices.createdAt,
        updatedAt: schema.invoices.updatedAt,
        // Customer join
        customerFirstName: schema.customers.firstName,
        customerLastName: schema.customers.lastName,
        customerCompany: schema.customers.company,
      })
      .from(schema.invoices)
      .leftJoin(schema.customers, eq(schema.invoices.customerId, schema.customers.id))
      .where(and(...conditions))
      .orderBy(orderFn(orderCol))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const lastRow = data[data.length - 1];

    // Total count
    const countConditions = [
      eq(schema.invoices.orgId, orgId),
      isNull(schema.invoices.deletedAt),
    ];
    if (status) {
      countConditions.push(eq(schema.invoices.status, status));
    }

    const [totalRow] = await db
      .select({ total: count() })
      .from(schema.invoices)
      .where(and(...countConditions));

    return {
      data: data.map((row) => ({
        ...row,
        customer: row.customerId
          ? {
              id: row.customerId,
              firstName: row.customerFirstName,
              lastName: row.customerLastName,
              company: row.customerCompany,
            }
          : null,
      })),
      pagination: {
        cursor: lastRow
          ? (sortBy === "due_date"
              ? lastRow.dueDate?.toISOString()
              : lastRow.createdAt?.toISOString()) ?? null
          : null,
        hasMore,
        total: Number(totalRow?.total ?? 0),
      },
    };
  }

  // ---- GET SINGLE ----
  async getInvoice(orgId: string, invoiceId: string) {
    const [invoice] = await db
      .select()
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.id, invoiceId),
          eq(schema.invoices.orgId, orgId),
          isNull(schema.invoices.deletedAt),
        ),
      )
      .limit(1);

    if (!invoice) return null;

    // Line items
    const lineItems = await db
      .select()
      .from(schema.invoiceLineItems)
      .where(
        and(
          eq(schema.invoiceLineItems.invoiceId, invoiceId),
          eq(schema.invoiceLineItems.orgId, orgId),
        ),
      )
      .orderBy(schema.invoiceLineItems.sortOrder);

    // Payments
    const paymentsList = await db
      .select()
      .from(schema.payments)
      .where(
        and(
          eq(schema.payments.invoiceId, invoiceId),
          eq(schema.payments.orgId, orgId),
        ),
      )
      .orderBy(desc(schema.payments.paidAt));

    // Customer
    let customer = null;
    if (invoice.customerId) {
      const [cust] = await db
        .select()
        .from(schema.customers)
        .where(
          and(
            eq(schema.customers.id, invoice.customerId),
            eq(schema.customers.orgId, orgId),
          ),
        )
        .limit(1);
      customer = cust ?? null;
    }

    // Quote (if linked)
    let quote = null;
    if (invoice.quoteId) {
      const [qt] = await db
        .select({
          id: schema.quotes.id,
          number: schema.quotes.number,
          title: schema.quotes.title,
        })
        .from(schema.quotes)
        .where(eq(schema.quotes.id, invoice.quoteId))
        .limit(1);
      quote = qt ?? null;
    }

    return { ...invoice, lineItems, payments: paymentsList, customer, quote };
  }

  // ---- UPDATE STATUS ----
  async updateInvoiceStatus(orgId: string, invoiceId: string, status: string) {
    const now = new Date();

    const updates: Record<string, unknown> = {
      status,
      updatedAt: now,
    };

    // Auto-set timestamps based on status
    if (status === "sent") {
      updates.sentAt = now;
      updates.issuedAt = now;
    }
    if (status === "paid") {
      updates.paidAt = now;
      updates.balanceDue = "0";
    }

    const [invoice] = await db
      .update(schema.invoices)
      .set(updates)
      .where(
        and(
          eq(schema.invoices.id, invoiceId),
          eq(schema.invoices.orgId, orgId),
        ),
      )
      .returning();

    return invoice ?? null;
  }

  // ---- RECORD PAYMENT ----
  async recordPayment(orgId: string, invoiceId: string, data: RecordPaymentData) {
    // Verify invoice exists
    const invoice = await this.getInvoice(orgId, invoiceId);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    const paidAt = data.paidAt ? new Date(data.paidAt) : new Date();
    const amount = String(Math.round(data.amount * 100) / 100);

    // Insert payment record
    const [payment] = await db
      .insert(schema.payments)
      .values({
        orgId,
        invoiceId,
        customerId: invoice.customerId!,
        amount,
        method: data.method,
        transactionId: data.transactionId ?? null,
        status: "completed",
        notes: data.notes ?? null,
        paidAt,
      })
      .returning();

    if (!payment) return null;

    // Update invoice amounts
    const currentPaid = parseFloat(invoice.amountPaid ?? "0");
    const currentTotal = parseFloat(invoice.total ?? "0");
    const newAmountPaid = Math.round((currentPaid + data.amount) * 100) / 100;
    const newBalance = Math.round((currentTotal - newAmountPaid) * 100) / 100;

    const invoiceUpdates: Record<string, unknown> = {
      amountPaid: String(newAmountPaid),
      balanceDue: String(Math.max(0, newBalance)),
      lastPaymentAt: paidAt,
      updatedAt: new Date(),
    };

    // Auto-mark as paid if balance is 0 or negative
    if (newBalance <= 0 && invoice.status !== "paid") {
      invoiceUpdates.status = "paid";
      invoiceUpdates.paidAt = paidAt;
    }

    await db
      .update(schema.invoices)
      .set(invoiceUpdates)
      .where(
        and(
          eq(schema.invoices.id, invoiceId),
          eq(schema.invoices.orgId, orgId),
        ),
      );

    return payment;
  }

  // ---- GET STATS ----
  async getInvoiceStats(orgId: string) {
    // Count by status
    const rows = await db
      .select({
        status: schema.invoices.status,
        count: count(),
        totalAmount: sum(schema.invoices.total),
      })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.orgId, orgId),
          isNull(schema.invoices.deletedAt),
        ),
      )
      .groupBy(schema.invoices.status);

    const byStatus: Record<string, { count: number; total: number }> = {};
    for (const row of rows) {
      if (row.status) {
        byStatus[row.status] = {
          count: Number(row.count),
          total: row.totalAmount ? parseFloat(row.totalAmount) : 0,
        };
      }
    }

    // Total invoiced
    const [totalRow] = await db
      .select({
        total: sum(schema.invoices.total),
        count: count(),
      })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.orgId, orgId),
          isNull(schema.invoices.deletedAt),
        ),
      );

    // Total paid
    const [paidRow] = await db
      .select({
        total: sum(schema.invoices.total),
        count: count(),
      })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.orgId, orgId),
          isNull(schema.invoices.deletedAt),
          eq(schema.invoices.status, "paid"),
        ),
      );

    // Outstanding (not paid, not cancelled, not void)
    const [outstandingRow] = await db
      .select({
        total: sum(schema.invoices.balanceDue),
        count: count(),
      })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.orgId, orgId),
          isNull(schema.invoices.deletedAt),
          sql`${schema.invoices.status} NOT IN ('paid', 'cancelled', 'void')`,
        ),
      );

    // Overdue (not paid and past due date)
    const [overdueRow] = await db
      .select({
        total: sum(schema.invoices.balanceDue),
        count: count(),
      })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.orgId, orgId),
          isNull(schema.invoices.deletedAt),
          sql`${schema.invoices.status} NOT IN ('paid', 'cancelled', 'void')`,
          lt(schema.invoices.dueDate, new Date()),
        ),
      );

    // Revenue this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [monthRevenue] = await db
      .select({
        total: sum(schema.payments.amount),
      })
      .from(schema.payments)
      .where(
        and(
          eq(schema.payments.orgId, orgId),
          eq(schema.payments.status, "completed"),
          gte(schema.payments.paidAt, startOfMonth),
        ),
      );

    return {
      byStatus,
      totalInvoiced: {
        count: Number(totalRow?.count ?? 0),
        total: totalRow?.total ? parseFloat(totalRow.total) : 0,
      },
      totalPaid: {
        count: Number(paidRow?.count ?? 0),
        total: paidRow?.total ? parseFloat(paidRow.total) : 0,
      },
      outstanding: {
        count: Number(outstandingRow?.count ?? 0),
        total: outstandingRow?.total ? parseFloat(outstandingRow.total) : 0,
      },
      overdue: {
        count: Number(overdueRow?.count ?? 0),
        total: overdueRow?.total ? parseFloat(overdueRow.total) : 0,
      },
      revenueThisMonth: monthRevenue?.total ? parseFloat(monthRevenue.total) : 0,
    };
  }
}

// Singleton instance
let _invoiceManager: InvoiceManager | null = null;

export function getInvoiceManager(): InvoiceManager {
  if (!_invoiceManager) {
    _invoiceManager = new InvoiceManager();
  }
  return _invoiceManager;
}
