// SitePilot AI — Invoice Detail Page
// Route: /dashboard/invoices/:id
import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { DashboardLayout } from "../dashboard/DashboardLayout";
import {
  ArrowLeft,
  Send,
  Building,
  Phone,
  Mail,
  FileText,
  DollarSign,
  CreditCard,
  CheckCircle,
} from "lucide-react";

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unit: string | null;
  unitPrice: string;
  total: string;
  sortOrder: number;
}

interface Payment {
  id: string;
  amount: string;
  method: string;
  transactionId: string | null;
  status: string;
  notes: string | null;
  paidAt: string;
  createdAt: string;
}

interface CustomerInfo {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
}

interface InvoiceDetail {
  id: string;
  number: string;
  status: string;
  subtotal: string;
  discountAmount: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  amountPaid: string;
  balanceDue: string;
  currency: string;
  dueDate: string;
  issuedAt: string | null;
  paidAt: string | null;
  sentAt: string | null;
  notes: string | null;
  terms: string | null;
  createdAt: string;
  updatedAt: string;
  lineItems: LineItem[];
  payments: Payment[];
  customer: CustomerInfo | null;
  quote: { id: string; number: string; title: string } | null;
}

function formatCurrency(amount: string | null | undefined, currency?: string | null): string {
  if (!amount) return "$0.00";
  const num = parseFloat(amount);
  if (isNaN(num)) return String(amount);
  const curr = currency ?? "USD";
  return num.toLocaleString("en-US", { style: "currency", currency: curr });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusBadge(status: string): { label: string; classes: string } {
  const map: Record<string, { label: string; classes: string }> = {
    draft: { label: "Draft", classes: "bg-gray-100 text-gray-700 border-gray-200" },
    sent: { label: "Sent", classes: "bg-blue-50 text-blue-700 border-blue-200" },
    paid: { label: "Paid", classes: "bg-green-50 text-green-700 border-green-200" },
    overdue: { label: "Overdue", classes: "bg-red-50 text-red-700 border-red-200" },
    cancelled: { label: "Cancelled", classes: "bg-gray-100 text-gray-500 border-gray-200" },
    void: { label: "Void", classes: "bg-gray-100 text-gray-500 border-gray-200" },
  };
  return map[status] ?? { label: status, classes: "bg-gray-100 text-gray-700" };
}

export function InvoiceDetailPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const fetchInvoice = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);
    try {
      const res = await api.get<{ data: InvoiceDetail }>(`/api/v1/orgs/${user.orgId}/invoices/${id}`);
      if (res.data) setInvoice(res.data.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  async function handleSend() {
    if (!user || !invoice) return;
    try {
      await api.post(`/api/v1/orgs/${user.orgId}/invoices/${invoice.id}/send`);
      await fetchInvoice();
    } catch {
      alert("Failed to send invoice.");
    }
  }

  async function handleMarkPaid() {
    if (!user || !invoice) return;
    const amount = parseFloat(invoice.balanceDue ?? "0");
    if (amount <= 0) return;

    try {
      await api.post(`/api/v1/orgs/${user.orgId}/invoices/${invoice.id}/payments`, {
        amount,
        method: "manual",
        notes: "Marked as paid",
      });
      await fetchInvoice();
    } catch {
      alert("Failed to record payment.");
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
              <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded" />
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="h-6 bg-gray-200 rounded w-24 mb-4" />
              <div className="h-4 bg-gray-200 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Invoice not found</p>
          <Link to="/dashboard/invoices" className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block">
            Back to invoices
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const badge = getStatusBadge(invoice.status);
  const isEditable = ["draft", "sent"].includes(invoice.status);

  return (
    <DashboardLayout>
      {/* Back link */}
      <Link
        to="/dashboard/invoices"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to invoices
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Invoice #{invoice.number}</h1>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${badge.classes}`}
            >
              {badge.label}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Created {formatDate(invoice.createdAt)}
            {invoice.sentAt && ` · Sent ${formatDate(invoice.sentAt)}`}
            {invoice.paidAt && ` · Paid ${formatDate(invoice.paidAt)}`}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {invoice.status === "draft" && (
            <button
              onClick={handleSend}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
            >
              <Send className="w-4 h-4" />
              Mark as Sent
            </button>
          )}
          {invoice.status === "sent" && (
            <>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition shadow-sm"
              >
                <CreditCard className="w-4 h-4" />
                Record Payment
              </button>
              <button
                onClick={handleMarkPaid}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition shadow-sm"
              >
                <CheckCircle className="w-4 h-4" />
                Mark as Paid
              </button>
            </>
          )}
          {invoice.status === "paid" && (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 text-sm font-medium rounded-lg border border-green-200">
              <CheckCircle className="w-4 h-4" />
              Paid on {formatDate(invoice.paidAt)}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main: Line Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Line items table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">Line Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase w-1/2">
                      Description
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Unit Price</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="px-6 py-3">
                        <p className="text-sm text-gray-900">{item.description}</p>
                        <p className="text-xs text-gray-400">{item.unit}</p>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">
                        {formatCurrency(item.unitPrice, invoice.currency)}
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(item.total, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
              </div>
              {parseFloat(invoice.discountAmount ?? "0") > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Discount</span>
                  <span className="text-red-600">-{formatCurrency(invoice.discountAmount, invoice.currency)}</span>
                </div>
              )}
              {parseFloat(invoice.taxRate ?? "0") > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax ({(parseFloat(invoice.taxRate ?? "0") * 100).toFixed(1)}%)</span>
                  <span className="text-gray-900">{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">{formatCurrency(invoice.total, invoice.currency)}</span>
              </div>
              {parseFloat(invoice.amountPaid ?? "0") > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount Paid</span>
                  <span className="text-green-600 font-medium">
                    {formatCurrency(invoice.amountPaid, invoice.currency)}
                  </span>
                </div>
              )}
              {invoice.balanceDue && parseFloat(invoice.balanceDue) > 0 && invoice.status !== "paid" && (
                <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-200">
                  <span className="text-red-600">Balance Due</span>
                  <span className="text-red-600">{formatCurrency(invoice.balanceDue, invoice.currency)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes & Terms */}
          {(invoice.notes || invoice.terms) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              {invoice.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Notes</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Terms</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.terms}</p>
                </div>
              )}
            </div>
          )}

          {/* Payments received */}
          {invoice.payments.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-700">Payments Received</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Method</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reference</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.payments.map((p) => (
                      <tr key={p.id} className="border-b border-gray-100">
                        <td className="px-6 py-3 text-sm text-gray-600">{formatDate(p.paidAt)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 capitalize">
                            {p.method}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                          {p.transactionId ?? "—"}
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-medium text-green-600">
                          {formatCurrency(p.amount, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Customer info + Details */}
        <div className="space-y-6">
          {/* Customer card */}
          {invoice.customer && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Bill To</h3>
              <p className="text-sm font-medium text-gray-900">
                {invoice.customer.firstName} {invoice.customer.lastName}
              </p>
              {invoice.customer.company && (
                <p className="text-sm text-gray-500">{invoice.customer.company}</p>
              )}
              <div className="mt-3 space-y-1.5">
                {invoice.customer.email && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Mail className="w-3.5 h-3.5" />
                    {invoice.customer.email}
                  </div>
                )}
                {invoice.customer.phone && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Phone className="w-3.5 h-3.5" />
                    {invoice.customer.phone}
                  </div>
                )}
                {(invoice.customer.addressLine1 || invoice.customer.city) && (
                  <div className="flex items-start gap-2 text-xs text-gray-500">
                    <Building className="w-3.5 h-3.5 mt-0.5" />
                    <div>
                      {invoice.customer.addressLine1 && <p>{invoice.customer.addressLine1}</p>}
                      {invoice.customer.addressLine2 && <p>{invoice.customer.addressLine2}</p>}
                      {invoice.customer.city && (
                        <p>
                          {invoice.customer.city}
                          {invoice.customer.state ? `, ${invoice.customer.state}` : ""}{" "}
                          {invoice.customer.postalCode}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Invoice details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Details</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-xs text-gray-500">Invoice #</dt>
                <dd className="text-xs font-medium text-gray-900">{invoice.number}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-xs text-gray-500">Status</dt>
                <dd>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.classes}`}
                  >
                    {badge.label}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-xs text-gray-500">Issue Date</dt>
                <dd className="text-xs text-gray-900">{formatDate(invoice.issuedAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-xs text-gray-500">Due Date</dt>
                <dd className={`text-xs font-medium ${invoice.status !== "paid" && new Date(invoice.dueDate) < new Date() ? "text-red-600" : "text-gray-900"}`}>
                  {formatDate(invoice.dueDate)}
                </dd>
              </div>
              {invoice.quote && (
                <div className="flex justify-between">
                  <dt className="text-xs text-gray-500">Quote</dt>
                  <dd className="text-xs text-blue-600 font-medium">{invoice.quote.number}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Payment summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Payment Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total</span>
                <span className="font-semibold text-gray-900">{formatCurrency(invoice.total, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Paid</span>
                <span className="text-green-600">{formatCurrency(invoice.amountPaid, invoice.currency)}</span>
              </div>
              {invoice.balanceDue && (
                <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                  <span className={`font-medium ${parseFloat(invoice.balanceDue) > 0 ? "text-red-600" : "text-gray-500"}`}>
                    Balance
                  </span>
                  <span className={`font-semibold ${parseFloat(invoice.balanceDue) > 0 ? "text-red-600" : "text-gray-900"}`}>
                    {formatCurrency(invoice.balanceDue, invoice.currency)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          invoice={invoice}
          onClose={() => setShowPaymentModal(false)}
          onPaid={() => {
            setShowPaymentModal(false);
            fetchInvoice();
          }}
        />
      )}
    </DashboardLayout>
  );
}

/** Simple payment recording modal */
function PaymentModal({
  invoice,
  onClose,
  onPaid,
}: {
  invoice: InvoiceDetail;
  onClose: () => void;
  onPaid: () => void;
}) {
  const { user } = useAuth();
  const [amount, setAmount] = useState(
    invoice.balanceDue ? String(parseFloat(invoice.balanceDue)) : "",
  );
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const res = await api.post(`/api/v1/orgs/${user.orgId}/invoices/${invoice.id}/payments`, {
        amount: parseFloat(amount),
        method,
        transactionId: reference || undefined,
        notes: notes || undefined,
      });
      if (res.error) {
        alert(res.error.message);
      } else {
        onPaid();
      }
    } catch {
      alert("Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Record Payment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="credit_card">Credit Card</option>
              <option value="check">Check</option>
              <option value="cash">Cash</option>
              <option value="stripe">Stripe</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference / Transaction ID</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
              placeholder="e.g., TXN-12345"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              placeholder="Payment notes..."
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {submitting ? "Recording..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
