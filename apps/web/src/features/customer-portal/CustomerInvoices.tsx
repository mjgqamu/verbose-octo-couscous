// SitePilot AI — Customer Portal Invoices List
// Route: /portal/invoices
import { useState, useEffect } from "react";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { DollarSign, CreditCard, Clock } from "lucide-react";

interface InvoiceSummary {
  id: string;
  number: string;
  status: string;
  total: string | null;
  amountPaid: string | null;
  balanceDue: string | null;
  currency: string | null;
  dueDate: string | null;
  issuedAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

function formatCurrency(amount: string | null, currency: string | null): string {
  if (!amount) return "—";
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  const curr = currency ?? "USD";
  return num.toLocaleString("en-US", { style: "currency", currency: curr });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === "paid" || status === "void") return false;
  return new Date(dueDate) < new Date();
}

export function CustomerInvoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.get<{ data: InvoiceSummary[] }>(`/api/v1/orgs/${user.orgId}/customer/invoices`)
      .then((res) => {
        if (res.data) setInvoices(res.data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Invoices</h1>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-48" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Invoices</h1>

      {invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No invoices yet</p>
          <p className="text-sm text-gray-400 mt-1">Your invoices will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => {
            const overdue = isOverdue(invoice.dueDate, invoice.status);
            const isPaidOrVoid = invoice.status === "paid" || invoice.status === "void";

            return (
              <div
                key={invoice.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: invoice info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Invoice #{invoice.number}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          invoice.status === "paid"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : invoice.status === "void"
                            ? "bg-gray-50 text-gray-500 border-gray-200"
                            : overdue
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {overdue ? "Overdue" : invoice.status === "paid" ? "Paid" : invoice.status === "void" ? "Void" : "Unpaid"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      {invoice.issuedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Issued {formatDate(invoice.issuedAt)}
                        </span>
                      )}
                      {invoice.dueDate && !isPaidOrVoid && (
                        <span className={`flex items-center gap-1 ${overdue ? "text-red-600 font-medium" : ""}`}>
                          <Clock className="w-3 h-3" /> Due {formatDate(invoice.dueDate)}
                        </span>
                      )}
                      {invoice.paidAt && (
                        <span className="flex items-center gap-1 text-green-600">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>{" "}
                          Paid {formatDate(invoice.paidAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: amount + action */}
                  <div className="flex items-center gap-4 ml-0 sm:ml-4 shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </p>
                      {invoice.balanceDue && parseFloat(invoice.balanceDue) > 0 && invoice.status !== "paid" && (
                        <p className="text-xs text-gray-500">
                          Balance due: {formatCurrency(invoice.balanceDue, invoice.currency)}
                        </p>
                      )}
                      {invoice.amountPaid && parseFloat(invoice.amountPaid) > 0 && (
                        <p className="text-xs text-green-600">
                          Paid: {formatCurrency(invoice.amountPaid, invoice.currency)}
                        </p>
                      )}
                    </div>
                    {!isPaidOrVoid && (
                      <button
                        onClick={() => {
                          alert("Payment would be processed via Stripe integration. This feature will be available soon.");
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Pay Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
