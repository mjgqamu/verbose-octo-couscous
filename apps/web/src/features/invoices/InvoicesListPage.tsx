// SitePilot AI — Invoices List Page
// Route: /dashboard/invoices
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { DashboardLayout } from "../dashboard/DashboardLayout";
import { InvoiceCreateModal } from "./InvoiceCreateModal";
import { Plus, Search, Filter, FileText, DollarSign, Clock } from "lucide-react";

interface InvoiceSummary {
  id: string;
  number: string;
  customerId: string;
  status: string;
  total: string | null;
  amountPaid: string | null;
  balanceDue: string | null;
  currency: string | null;
  dueDate: string | null;
  issuedAt: string | null;
  createdAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    company: string | null;
  } | null;
}

interface PaginationInfo {
  cursor: string | null;
  hasMore: boolean;
  total: number;
}

function formatCurrency(amount: string | null, currency: string | null): string {
  if (!amount) return "$0.00";
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  const curr = currency ?? "USD";
  return num.toLocaleString("en-US", { style: "currency", currency: curr });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
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

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || ["paid", "cancelled", "void"].includes(status)) return false;
  return new Date(dueDate) < new Date();
}

export function InvoicesListPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ cursor: null, hasMore: false, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchInvoices = useCallback(
    async (status?: string) => {
      if (!user) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        params.set("limit", "20");

        const res = await api.get<{ data: InvoiceSummary[]; pagination: PaginationInfo }>(
          `/api/v1/orgs/${user.orgId}/invoices?${params.toString()}`,
        );
        if (res.data) {
          setInvoices(res.data.data);
          setPagination(res.data.pagination);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    fetchInvoices(statusFilter);
  }, [fetchInvoices, statusFilter]);

  function handleCreated() {
    setShowCreateModal(false);
    fetchInvoices(statusFilter);
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-1">
            {pagination.total} invoice{pagination.total !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search invoices..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["", "draft", "sent", "paid", "overdue", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                statusFilter === s
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="px-6 py-4 border-b border-gray-100 last:border-0 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-48" />
            </div>
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No invoices found</p>
          <p className="text-sm text-gray-400 mt-1">
            {statusFilter ? "No invoices match the selected filter." : "Create your first invoice to get started."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Paid</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const badge = getStatusBadge(inv.status);
                  const overdue = isOverdue(inv.dueDate, inv.status);
                  const displayStatus = overdue ? "overdue" : inv.status;
                  const displayBadge = overdue
                    ? getStatusBadge("overdue")
                    : badge;

                  return (
                    <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <Link
                          to={`/dashboard/invoices/${inv.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          {inv.number}
                        </Link>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(inv.issuedAt)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">
                          {inv.customer
                            ? `${inv.customer.firstName} ${inv.customer.lastName}`
                            : "—"}
                        </p>
                        {inv.customer?.company && (
                          <p className="text-xs text-gray-500">{inv.customer.company}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${displayBadge.classes}`}
                        >
                          {displayBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(inv.total, inv.currency)}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm text-gray-600">
                          {formatCurrency(inv.amountPaid, inv.currency)}
                        </p>
                        {inv.balanceDue && parseFloat(inv.balanceDue) > 0 && inv.status !== "paid" && (
                          <p className="text-xs text-red-500">
                            {formatCurrency(inv.balanceDue, inv.currency)} due
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-sm ${overdue ? "text-red-600 font-medium" : "text-gray-600"}`}
                        >
                          {formatDate(inv.dueDate)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {invoices.map((inv) => {
              const badge = getStatusBadge(inv.status);
              const overdue = isOverdue(inv.dueDate, inv.status);
              const displayBadge = overdue ? getStatusBadge("overdue") : badge;

              return (
                <Link
                  key={inv.id}
                  to={`/dashboard/invoices/${inv.id}`}
                  className="block px-4 py-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-blue-600">{inv.number}</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${displayBadge.classes}`}
                    >
                      {displayBadge.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900">
                    {inv.customer
                      ? `${inv.customer.firstName} ${inv.customer.lastName}`
                      : "—"}
                  </p>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>{formatCurrency(inv.total, inv.currency)}</span>
                    <span>Due {formatDate(inv.dueDate)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <InvoiceCreateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}
    </DashboardLayout>
  );
}
