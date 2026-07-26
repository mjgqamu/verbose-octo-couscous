// SitePilot AI — Analytics Dashboard
// Full reports page with KPI cards, CSS-only charts, and date range filtering.
// Route: /dashboard/reports (business_owner only)

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { DashboardLayout } from "../dashboard/DashboardLayout";
import { AiAnalystPanel } from "./AiAnalystPanel";
import {
  TrendingUp,
  Users,
  Wrench,
  DollarSign,
  FileText,
  Phone,
  Bot,
  CalendarCheck,
  BarChart,
} from "lucide-react";

// ---- Types ----

interface DashboardMetrics {
  leadsThisMonth: number;
  leadsTotal: number;
  callsReceived: number;
  callsMissed: number;
  missedCallRate: number;
  appointmentsBooked: number;
  appointmentsCompleted: number;
  quotesSent: number;
  quotesAccepted: number;
  quoteConversionRate: number;
  jobsCompleted: number;
  jobsActive: number;
  invoicesPaid: number;
  invoicesOutstanding: number;
  revenueThisMonth: number;
  revenueTotal: number;
  conversionRate: number;
  avgJobValue: number;
}

interface LeadAnalytics {
  bySource: Array<{ source: string; count: number }>;
  byStage: Array<{ stage: string; count: number }>;
  trend: Array<{ period: string; count: number }>;
}

interface RevenueAnalytics {
  trend: Array<{ period: string; revenue: number }>;
  byServiceType: Array<{ serviceType: string; revenue: number; count: number }>;
}

interface JobAnalytics {
  byStatus: Array<{ status: string; count: number }>;
  completionRate: number;
  avgCompletionTimeHours: number | null;
}

interface AiAnalytics {
  conversationsTotal: number;
  conversationsAiHandled: number;
  leadsCreatedByAi: number;
  appointmentsBookedByAi: number;
  aiEscalationRate: number;
  aiEscalated: number;
}

type DateRangePreset = "this_month" | "last_month" | "last_3_months" | "this_year";

// ---- Helpers ----

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
}

function formatPct(rate: number): string {
  return `${rate}%`;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getPresetRange(preset: DateRangePreset): { from: string; to: string } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "this_month":
      return { from: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)), to: toDateInputValue(to) };
    case "last_month":
      return {
        from: toDateInputValue(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    case "last_3_months":
      return {
        from: toDateInputValue(new Date(now.getFullYear(), now.getMonth() - 3, 1)),
        to: toDateInputValue(to),
      };
    case "this_year":
      return { from: toDateInputValue(new Date(now.getFullYear(), 0, 1)), to: toDateInputValue(to) };
  }
}

// ---- CSS-only Bar Chart Components ----

function HorizontalBar({ value, max, label, color = "bg-blue-500" }: { value: number; max: number; label: string; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-xs text-gray-600 w-24 shrink-0 truncate" title={label}>{label}</span>
      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-10 text-right">{value}</span>
    </div>
  );
}

function VerticalBarChart({ data, maxHeight = 160 }: { data: Array<{ label: string; value: number }>; maxHeight?: number }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2 h-full" style={{ minHeight: maxHeight + 24 }}>
      {data.map((d, i) => {
        const h = (d.value / max) * maxHeight;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <span className="text-xs font-semibold text-gray-700">{d.value}</span>
            <div
              className="w-full bg-blue-500 rounded-t-md transition-all duration-500 min-w-[8px]"
              style={{ height: Math.max(h, 2) }}
            />
            <span className="text-[10px] text-gray-500 truncate w-full text-center" title={d.label}>
              {d.label.length > 6 ? d.label.slice(0, 5) + "…" : d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---- Gauge Component ----

function SimpleGauge({ value, label, color = "bg-green-500" }: { value: number; label: string; color?: string }) {
  const pct = Math.min(value, 100);
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" viewBox="0 0 100 100" className="transform -rotate-90">
        <circle cx="50" cy="50" r="36" fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r="36"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={color.replace("bg-", "text-")}
        />
      </svg>
      <span className="text-xl font-bold text-gray-900 -mt-10 mb-1">{formatPct(pct)}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

// ---- Main Component ----

export function AnalyticsDashboard() {
  const { user } = useAuth();
  const [preset, setPreset] = useState<DateRangePreset>("this_month");
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [leadAnalytics, setLeadAnalytics] = useState<LeadAnalytics | null>(null);
  const [revenueAnalytics, setRevenueAnalytics] = useState<RevenueAnalytics | null>(null);
  const [jobAnalytics, setJobAnalytics] = useState<JobAnalytics | null>(null);
  const [aiAnalytics, setAiAnalytics] = useState<AiAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => getPresetRange(preset), [preset]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const orgPath = `/api/v1/orgs/${user.orgId}/analytics`;

    Promise.all([
      api.get<{ data: DashboardMetrics }>(`${orgPath}/dashboard`),
      api.get<{ data: LeadAnalytics }>(`${orgPath}/leads?dateFrom=${range.from}&dateTo=${range.to}`),
      api.get<{ data: RevenueAnalytics }>(`${orgPath}/revenue?dateFrom=${range.from}&dateTo=${range.to}`),
      api.get<{ data: JobAnalytics }>(`${orgPath}/jobs?dateFrom=${range.from}&dateTo=${range.to}`),
      api.get<{ data: AiAnalytics }>(`${orgPath}/ai`),
    ])
      .then(([mRes, lRes, rRes, jRes, aRes]) => {
        if (mRes.data) setMetrics(mRes.data.data);
        if (lRes.data) setLeadAnalytics(lRes.data.data);
        if (rRes.data) setRevenueAnalytics(rRes.data.data);
        if (jRes.data) setJobAnalytics(jRes.data.data);
        if (aRes.data) setAiAnalytics(aRes.data.data);
      })
      .catch(() => {
        // Silently fail — show empty state
      })
      .finally(() => setLoading(false));
  }, [user, range.from, range.to]);

  const presets: Array<{ key: DateRangePreset; label: string }> = [
    { key: "this_month", label: "This Month" },
    { key: "last_month", label: "Last Month" },
    { key: "last_3_months", label: "Last 3 Months" },
    { key: "this_year", label: "This Year" },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-sm text-gray-500 mt-1">Business intelligence and performance metrics</p>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {presets.map((p) => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                  preset === p.key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---- AI Business Analyst ---- */}
      <div className="mb-6">
        <AiAnalystPanel />
      </div>

      {/* ---- KPI Cards ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <KpiCard icon={Users} label="Leads" value={metrics?.leadsThisMonth ?? 0} color="bg-blue-50 text-blue-600" />
        <KpiCard icon={TrendingUp} label="Conv. Rate" value={metrics ? `${metrics.conversionRate}%` : "—"} color="bg-green-50 text-green-600" />
        <KpiCard icon={DollarSign} label="Revenue" value={metrics ? formatCurrency(metrics.revenueThisMonth) : "—"} color="bg-purple-50 text-purple-600" />
        <KpiCard icon={Wrench} label="Active Jobs" value={metrics?.jobsActive ?? 0} color="bg-orange-50 text-orange-600" />
        <KpiCard icon={FileText} label="Quote Win" value={metrics ? `${metrics.quoteConversionRate}%` : "—"} color="bg-emerald-50 text-emerald-600" />
        <KpiCard icon={Phone} label="Missed Calls" value={metrics ? `${metrics.missedCallRate}%` : "—"} color="bg-red-50 text-red-600" />
      </div>

      {/* ---- Two Column Layout ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Lead Funnel */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Lead Funnel</h2>
          {leadAnalytics?.byStage && leadAnalytics.byStage.length > 0 ? (
            <div className="space-y-1">
              {leadAnalytics.byStage.map((s) => {
                const max = Math.max(...leadAnalytics.byStage.map((x) => x.count), 1);
                const colors: Record<string, string> = {
                  new: "bg-blue-400",
                  contacted: "bg-blue-500",
                  qualified: "bg-indigo-500",
                  quote_sent: "bg-amber-500",
                  approved: "bg-orange-500",
                  job_scheduled: "bg-green-500",
                  completed: "bg-emerald-600",
                  lost: "bg-gray-400",
                };
                return (
                  <HorizontalBar
                    key={s.stage}
                    label={s.stage.replace(/_/g, " ")}
                    value={s.count}
                    max={max}
                    color={colors[s.stage] ?? "bg-blue-500"}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState text="No lead data yet" />
          )}
        </div>

        {/* Revenue Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Revenue Trend</h2>
          {revenueAnalytics?.trend && revenueAnalytics.trend.length > 0 ? (
            <VerticalBarChart
              data={revenueAnalytics.trend.map((t) => ({
                label: t.period.slice(5), // MM-DD part
                value: Math.round(t.revenue),
              }))}
            />
          ) : (
            <EmptyState text="No revenue data for this period" />
          )}
        </div>

        {/* AI Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">AI Activity</h2>
          {aiAnalytics ? (
            <div className="grid grid-cols-2 gap-4">
              <AiStat icon={Bot} label="Conversations" value={aiAnalytics.conversationsTotal} />
              <AiStat icon={Bot} label="AI Handled" value={aiAnalytics.conversationsAiHandled} />
              <AiStat icon={Users} label="Leads by AI" value={aiAnalytics.leadsCreatedByAi} />
              <AiStat icon={CalendarCheck} label="Booked by AI" value={aiAnalytics.appointmentsBookedByAi} />
              <div className="col-span-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">AI Escalation Rate</span>
                  <span className="text-lg font-bold text-amber-600">{aiAnalytics.aiEscalationRate}%</span>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState text="No AI data yet" />
          )}
        </div>

        {/* Jobs */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Jobs Overview</h2>
          {jobAnalytics ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-center">
                <SimpleGauge value={jobAnalytics.completionRate} label="Completion Rate" color="bg-emerald-500" />
              </div>
              {jobAnalytics.avgCompletionTimeHours !== null && (
                <div className="text-center text-sm text-gray-500">
                  Avg completion time: <span className="font-semibold text-gray-700">{jobAnalytics.avgCompletionTimeHours} hrs</span>
                </div>
              )}
              <div className="space-y-1">
                {jobAnalytics.byStatus.map((s) => {
                  const max = Math.max(...jobAnalytics.byStatus.map((x) => x.count), 1);
                  const colors: Record<string, string> = {
                    new: "bg-blue-400",
                    scheduled: "bg-blue-500",
                    assigned: "bg-indigo-500",
                    in_progress: "bg-amber-500",
                    waiting_on_parts: "bg-yellow-400",
                    waiting_on_customer: "bg-yellow-300",
                    completed: "bg-emerald-500",
                    cancelled: "bg-red-400",
                  };
                  return (
                    <HorizontalBar
                      key={s.status}
                      label={s.status.replace(/_/g, " ")}
                      value={s.count}
                      max={max}
                      color={colors[s.status] ?? "bg-gray-400"}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <EmptyState text="No job data yet" />
          )}
        </div>
      </div>

      {/* ---- Revenue by Service Type ---- */}
      {revenueAnalytics?.byServiceType && revenueAnalytics.byServiceType.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Revenue by Service Type</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {revenueAnalytics.byServiceType.map((s) => (
              <div key={s.serviceType} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">{s.serviceType}</p>
                  <p className="text-xs text-gray-500">{s.count} job{s.count !== 1 ? "s" : ""}</p>
                </div>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(s.revenue)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Lead Sources ---- */}
      {leadAnalytics?.bySource && leadAnalytics.bySource.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Leads by Source</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {leadAnalytics.bySource.map((s) => (
              <div key={s.source} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700 capitalize">{s.source.replace(/_/g, " ")}</span>
                <span className="text-lg font-bold text-gray-900">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Bottom Stats Row ---- */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniStat label="Total Leads" value={metrics.leadsTotal} />
          <MiniStat label="Total Revenue" value={formatCurrency(metrics.revenueTotal)} />
          <MiniStat label="Avg Job Value" value={formatCurrency(metrics.avgJobValue)} />
          <MiniStat label="Outstanding Invoices" value={metrics.invoicesOutstanding} />
        </div>
      )}
    </DashboardLayout>
  );
}

// ---- Sub-components ----

function KpiCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
    </div>
  );
}

function AiStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      <BarChart className="w-10 h-10 mb-2" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
