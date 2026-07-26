// SitePilot AI — Customer Portal Quote Detail
// Route: /portal/quotes/:id
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";

interface QuoteLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
  sortOrder: number;
}

interface QuoteDetail {
  id: string;
  number: string;
  status: string;
  title: string | null;
  description: string | null;
  subtotal: string | null;
  discountAmount: string | null;
  discountPercent: string | null;
  taxRate: string | null;
  taxAmount: string | null;
  total: string | null;
  currency: string | null;
  validUntil: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  createdAt: string;
  lineItems: QuoteLineItem[];
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  draft: { label: "Draft", classes: "bg-gray-50 text-gray-600 border-gray-200" },
  sent: { label: "Sent", classes: "bg-blue-50 text-blue-700 border-blue-200" },
  viewed: { label: "Viewed", classes: "bg-purple-50 text-purple-700 border-purple-200" },
  accepted: { label: "Accepted", classes: "bg-green-50 text-green-700 border-green-200" },
  declined: { label: "Declined", classes: "bg-red-50 text-red-700 border-red-200" },
  expired: { label: "Expired", classes: "bg-gray-50 text-gray-500 border-gray-200" },
};

function formatCurrency(amount: string | null, currency: string | null): string {
  if (!amount) return "—";
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  const curr = currency ?? "USD";
  return num.toLocaleString("en-US", { style: "currency", currency: curr });
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function CustomerQuoteDetail() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!user || !id) return;
    setLoading(true);
    api.get<{ data: QuoteDetail }>(`/api/v1/orgs/${user.orgId}/customer/quotes/${id}`)
      .then((res) => {
        if (res.data) setQuote(res.data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user, id]);

  async function handleAction(action: "approve" | "decline") {
    if (!user || !id) return;
    setActionLoading(true);
    setActionError("");

    const res = await api.post<{ data: QuoteDetail }>(
      `/api/v1/orgs/${user.orgId}/customer/quotes/${id}/${action}`
    );

    if (res.data) {
      setQuote(res.data.data);
    } else if (res.error) {
      setActionError(res.error.message);
    }

    setActionLoading(false);
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
          <div className="h-8 bg-gray-200 rounded w-64" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-32" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-20 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div>
        <Link to="/portal/quotes" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Quotes
        </Link>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Quote not found.</p>
        </div>
      </div>
    );
  }

  const status = STATUS_CONFIG[quote.status] ?? STATUS_CONFIG.draft!;
  const canRespond = quote.status === "sent" || quote.status === "viewed";
  const hasResponded = quote.status === "accepted" || quote.status === "declined";

  return (
    <div>
      {/* Back */}
      <Link to="/portal/quotes" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition">
        <ArrowLeft className="w-4 h-4" /> Back to Quotes
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {quote.title || `Quote #${quote.number}`}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.classes}`}>
              {status.label}
            </span>
            <span className="text-xs text-gray-400">
              #{quote.number} · Created {formatDate(quote.createdAt)}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        {canRespond && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleAction("decline")}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-700 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 transition"
            >
              {actionLoading ? (
                <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              Decline
            </button>
            <button
              onClick={() => handleAction("approve")}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition shadow-sm"
            >
              {actionLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Accept
            </button>
          </div>
        )}
      </div>

      {/* Action error */}
      {actionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Response confirmation */}
      {hasResponded && (
        <div className={`mb-6 p-4 rounded-xl border ${quote.status === "accepted" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <div className="flex items-center gap-2">
            {quote.status === "accepted" ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <span className={`text-sm font-medium ${quote.status === "accepted" ? "text-green-700" : "text-red-700"}`}>
              {quote.status === "accepted" ? "You accepted this quote" : "You declined this quote"}
              {quote.acceptedAt && ` on ${formatDate(quote.acceptedAt)}`}
              {quote.declinedAt && ` on ${formatDate(quote.declinedAt)}`}
            </span>
          </div>
        </div>
      )}

      {/* Details card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="p-6">
          {quote.description && (
            <p className="text-sm text-gray-600 mb-6 pb-6 border-b border-gray-100">{quote.description}</p>
          )}

          {/* Line items */}
          {quote.lineItems && quote.lineItems.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Line Items</h3>
              <div className="space-y-2">
                {quote.lineItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{item.description}</p>
                      <p className="text-xs text-gray-400">Qty: {item.quantity} × {formatCurrency(item.unitPrice, quote.currency)}</p>
                    </div>
                    <span className="text-sm font-medium text-gray-900 ml-4 shrink-0">
                      {formatCurrency(item.total, quote.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="space-y-2 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-900">{formatCurrency(quote.subtotal, quote.currency)}</span>
            </div>
            {quote.discountAmount && parseFloat(quote.discountAmount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  Discount
                  {quote.discountPercent && ` (${quote.discountPercent}%)`}
                </span>
                <span className="text-red-600">-{formatCurrency(quote.discountAmount, quote.currency)}</span>
              </div>
            )}
            {quote.taxAmount && parseFloat(quote.taxAmount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax{quote.taxRate ? ` (${quote.taxRate}%)` : ""}</span>
                <span className="text-gray-900">{formatCurrency(quote.taxAmount, quote.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-100">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900">{formatCurrency(quote.total, quote.currency)}</span>
            </div>
          </div>
        </div>

        {/* Timeline footer */}
        <div className="bg-gray-50 px-6 py-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
          {quote.sentAt && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> Sent {formatDate(quote.sentAt)}
            </span>
          )}
          {quote.viewedAt && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> Viewed {formatDate(quote.viewedAt)}
            </span>
          )}
          {quote.validUntil && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> Valid until {formatDate(quote.validUntil)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
