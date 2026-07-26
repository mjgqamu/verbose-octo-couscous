import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { DashboardLayout } from "../dashboard/DashboardLayout";
import { RequireRole } from "../../lib/ProtectedRoute";
import { StageBadge, SourceBadge } from "../../components/ui";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Edit3,
} from "lucide-react";

interface CustomerDetail {
  id: string;
  firstName: string;
  lastName: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  phoneAlt?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  source?: string | null;
  tags?: string[] | null;
  notes?: string | null;
  lifetimeValue?: string | null;
  totalJobs?: number | null;
  lastJobAt?: string | null;
  createdAt: string;
  updatedAt: string;
  leads: {
    id: string;
    title?: string | null;
    stage: string;
    source: string;
    estimatedValue?: string | null;
    createdAt: string;
  }[];
  jobs: {
    id: string;
    title?: string | null;
    status: string;
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
    totalAmount?: string | null;
  }[];
  quotes: {
    id: string;
    title?: string | null;
    status: string;
    totalAmount?: string | null;
    createdAt: string;
  }[];
  invoices: {
    id: string;
    number?: string | null;
    status: string;
    totalAmount?: string | null;
    dueDate?: string | null;
    createdAt: string;
  }[];
  conversations: {
    id: string;
    channel: string;
    subject?: string | null;
    lastMessageAt?: string | null;
  }[];
}

type TabKey = "leads" | "jobs" | "quotes" | "invoices" | "activity";

export function CustomerDetailPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("leads");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get<{ data: CustomerDetail }>(`/api/v1/orgs/${user!.orgId}/customers/${id}`).then((res) => {
      if (res.data) setCustomer(res.data.data);
      setLoading(false);
    });
  }, [id, user]);

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "leads", label: "Leads", count: customer?.leads.length ?? 0 },
    { key: "jobs", label: "Jobs", count: customer?.jobs.length ?? 0 },
    { key: "quotes", label: "Quotes", count: customer?.quotes.length ?? 0 },
    { key: "invoices", label: "Invoices", count: customer?.invoices.length ?? 0 },
    { key: "activity", label: "Activity", count: customer?.conversations.length ?? 0 },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-48 bg-gray-200 rounded-xl" />
            <div className="lg:col-span-2 h-80 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <p className="text-gray-500">Customer not found.</p>
          <button onClick={() => navigate("/dashboard/customers")} className="mt-4 text-blue-600 hover:underline text-sm font-medium">Back to customers</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <RequireRole roles={["business_owner", "office_admin"]}>
        {/* Breadcrumb */}
        <button
          onClick={() => navigate("/dashboard/customers")}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Customers
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xl shrink-0">
              {customer.firstName[0]}{customer.lastName[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{customer.firstName} {customer.lastName}</h1>
              {customer.company && <p className="text-sm text-gray-500">{customer.company}</p>}
            </div>
          </div>
          <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
            <Edit3 className="w-4 h-4" /> Edit
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer info card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="space-y-3">
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">{customer.phone}</a>
                </div>
              )}
              {customer.phoneAlt && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{customer.phoneAlt} (alt)</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">{customer.email}</a>
                </div>
              )}
              {(customer.addressLine1 || customer.city) && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div className="text-gray-600">
                    {customer.addressLine1 && <p>{customer.addressLine1}</p>}
                    {customer.addressLine2 && <p>{customer.addressLine2}</p>}
                    <p>
                      {[customer.city, customer.state, customer.postalCode].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Lifetime Value</span>
                <span className="font-semibold text-gray-900">
                  {customer.lifetimeValue && parseFloat(customer.lifetimeValue) > 0
                    ? parseFloat(customer.lifetimeValue).toLocaleString("en-US", { style: "currency", currency: "USD" })
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Jobs</span>
                <span className="font-semibold text-gray-900">{customer.totalJobs ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Last Job</span>
                <span className="text-gray-900">
                  {customer.lastJobAt ? new Date(customer.lastJobAt).toLocaleDateString() : "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Source</span>
                <span>{customer.source ? <SourceBadge source={customer.source} /> : "—"}</span>
              </div>
            </div>

            {customer.tags && customer.tags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {customer.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {customer.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Notes</p>
                <p className="text-sm text-gray-700">{customer.notes}</p>
              </div>
            )}
          </div>

          {/* Tabs + content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Tab bar */}
              <div className="flex border-b border-gray-200 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === tab.key
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className={`text-xs rounded-full px-1.5 py-0.5 ${
                        activeTab === tab.key ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-4">
                {activeTab === "leads" && (
                  customer.leads.length === 0 ? (
                    <p className="text-sm text-gray-500 py-8 text-center">No leads associated with this customer.</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {customer.leads.map((lead) => (
                        <div
                          key={lead.id}
                          className="flex items-center justify-between py-3 cursor-pointer hover:bg-gray-50 px-2 -mx-2 rounded-lg transition"
                          onClick={() => navigate(`/dashboard/leads/${lead.id}`)}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{lead.title || "Untitled"}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <StageBadge stage={lead.stage} size="sm" />
                              <SourceBadge source={lead.source} />
                            </div>
                          </div>
                          <div className="text-right ml-4 shrink-0">
                            {lead.estimatedValue && (
                              <p className="text-sm font-medium text-gray-900">{parseFloat(lead.estimatedValue).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 })}</p>
                            )}
                            <p className="text-xs text-gray-400">{new Date(lead.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {activeTab === "jobs" && (
                  customer.jobs.length === 0 ? (
                    <p className="text-sm text-gray-500 py-8 text-center">No jobs yet.</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {customer.jobs.map((job) => (
                        <div key={job.id} className="flex items-center justify-between py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{job.title || "Job #" + job.id.slice(0, 8)}</p>
                            <p className="text-xs text-gray-500">
                              {job.status} {job.scheduledStart ? `• ${new Date(job.scheduledStart).toLocaleDateString()}` : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            {job.totalAmount && <p className="text-sm font-medium text-gray-900">{parseFloat(job.totalAmount).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 })}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {activeTab === "quotes" && (
                  customer.quotes.length === 0 ? (
                    <p className="text-sm text-gray-500 py-8 text-center">No quotes yet.</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {customer.quotes.map((quote) => (
                        <div key={quote.id} className="flex items-center justify-between py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{quote.title || "Quote #" + quote.id.slice(0, 8)}</p>
                            <p className="text-xs text-gray-500">{quote.status} • {new Date(quote.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            {quote.totalAmount && <p className="text-sm font-medium text-gray-900">{parseFloat(quote.totalAmount).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 })}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {activeTab === "invoices" && (
                  customer.invoices.length === 0 ? (
                    <p className="text-sm text-gray-500 py-8 text-center">No invoices yet.</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {customer.invoices.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{inv.number || "Invoice #" + inv.id.slice(0, 8)}</p>
                            <p className="text-xs text-gray-500">
                              {inv.status} {inv.dueDate ? `• Due ${new Date(inv.dueDate).toLocaleDateString()}` : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            {inv.totalAmount && <p className="text-sm font-medium text-gray-900">{parseFloat(inv.totalAmount).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 })}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {activeTab === "activity" && (
                  customer.conversations.length === 0 ? (
                    <p className="text-sm text-gray-500 py-8 text-center">No conversations yet.</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {customer.conversations.map((conv) => (
                        <div key={conv.id} className="flex items-center justify-between py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{conv.subject || `${conv.channel} conversation`}</p>
                            <p className="text-xs text-gray-500">via {conv.channel}</p>
                          </div>
                          <div className="text-right">
                            {conv.lastMessageAt && <p className="text-xs text-gray-400">{new Date(conv.lastMessageAt).toLocaleDateString()}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </RequireRole>
    </DashboardLayout>
  );
}
