// SitePilot AI — Customer Portal Quotes List
// Route: /portal/quotes
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { FileText, ChevronRight } from "lucide-react";

interface QuoteSummary {
  id: string;
  number: string;
  status: string;
  title: string | null;
  description: string | null;
  total: string | null;
  currency: string | null;
  createdAt: string;
  validUntil: string | null;
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function CustomerQuotes() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.get<{ data: QuoteSummary[] }>(`/api/v1/orgs/${user.orgId}/customer/quotes`)
      .then((res) => {
        if (res.data) setQuotes(res.data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Quotes</h1>
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Quotes</h1>

      {quotes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No quotes yet</p>
          <p className="text-sm text-gray-400 mt-1">Quotes from your service provider will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map((quote) => {
            const status = STATUS_CONFIG[quote.status] ?? STATUS_CONFIG.draft!;
            return (
              <Link
                key={quote.id}
                to={`/portal/quotes/${quote.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {quote.title || `Quote #${quote.number}`}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${status.classes}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDate(quote.createdAt)}
                      {quote.validUntil && ` · Valid until ${formatDate(quote.validUntil)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(quote.total, quote.currency)}
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
