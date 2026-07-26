// SitePilot AI — Dashboard Home Page
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { RequireRole } from "../../lib/ProtectedRoute";
import { DashboardLayout } from "./DashboardLayout";
import { TrendingUp, Users, CalendarCheck, Wrench, Clock, Phone, DollarSign, ArrowRight } from "lucide-react";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface JobStats {
  activeJobs: number;
  todayJobs: number;
  completedToday: number;
  completionRate: number;
  techStats?: {
    jobsToday: number;
    completed: number;
  } | null;
}

interface InvoiceStats {
  outstanding: { count: number; total: number };
  revenueThisMonth: number;
}

export function DashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date();
  const [jobStats, setJobStats] = useState<JobStats | null>(null);
  const [invoiceStats, setInvoiceStats] = useState<InvoiceStats | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<{ data: JobStats }>(`/api/v1/orgs/${user.orgId}/jobs/stats`).then((res) => {
      if (res.data) setJobStats(res.data.data);
    }).catch(() => {
      // Silently fail — stats are non-critical on dashboard
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    api.get<{ data: InvoiceStats }>(`/api/v1/orgs/${user.orgId}/invoices/stats`).then((res) => {
      if (res.data) setInvoiceStats(res.data.data);
    }).catch(() => {
      // Silently fail
    });
  }, [user]);

  // Owner/admin stats
  const stats = [
    { label: "Leads Today", value: "12", icon: Users, color: "bg-blue-50 text-blue-600" },
    { label: "Missed Calls Today", value: "—", icon: Phone, color: "bg-red-50 text-red-600" },
    { label: "Appointments", value: "8", icon: CalendarCheck, color: "bg-green-50 text-green-600" },
    { label: "Active Jobs", value: jobStats ? String(jobStats.activeJobs) : "—", icon: Wrench, color: "bg-orange-50 text-orange-600" },
    { label: "Completed Today", value: jobStats ? String(jobStats.completedToday) : "—", icon: CalendarCheck, color: "bg-emerald-50 text-emerald-600" },
  ];

  // Invoice stats for business_owner/office_admin
  const invoiceStatCards = user?.role === "business_owner" || user?.role === "office_admin"
    ? [
        {
          label: "Outstanding Invoices",
          value: invoiceStats ? String(invoiceStats.outstanding.count) : "—",
          icon: DollarSign,
          color: "bg-amber-50 text-amber-600",
        },
        {
          label: "Revenue This Month",
          value: invoiceStats
            ? invoiceStats.revenueThisMonth.toLocaleString("en-US", { style: "currency", currency: "USD" })
            : "—",
          icon: TrendingUp,
          color: "bg-purple-50 text-purple-600",
        },
      ]
    : [];

  // Tech role gets a different set
  const techStats = [
    { label: "My Jobs Today", value: jobStats?.techStats ? String(jobStats.techStats.jobsToday) : "—", icon: Wrench, color: "bg-blue-50 text-blue-600" },
    { label: "Completed", value: jobStats?.techStats ? String(jobStats.techStats.completed) : "—", icon: CalendarCheck, color: "bg-green-50 text-green-600" },
    { label: "Upcoming", value: "—", icon: Clock, color: "bg-orange-50 text-orange-600" },
    { label: "This Week", value: "—", icon: TrendingUp, color: "bg-purple-50 text-purple-600" },
  ];

  const displayStats = user?.role === "technician" ? techStats : stats;

  // Placeholder activity
  const activities = [
    { text: "New lead: Sarah Johnson — Bathroom renovation", time: "10 minutes ago", type: "lead" },
    { text: "Quote #124 accepted by Mike's Construction", time: "45 minutes ago", type: "quote" },
    { text: "Job #89 marked complete — HVAC repair", time: "2 hours ago", type: "job" },
    { text: "Invoice #312 paid — $2,450.00", time: "3 hours ago", type: "invoice" },
    { text: "Missed call from (555) 123-4567 — AI followed up", time: "4 hours ago", type: "call" },
  ];

  return (
    <DashboardLayout>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {user?.orgName} &middot; {formatDate(today)}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        {displayStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{stat.label}</span>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Invoice stats row (only for owner/admin) */}
      {invoiceStatCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {invoiceStatCards.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">{stat.label}</span>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity feed */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {activities.map((activity, i) => (
              <div key={i} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                  activity.type === "lead" ? "bg-blue-500" :
                  activity.type === "quote" ? "bg-green-500" :
                  activity.type === "job" ? "bg-orange-500" :
                  activity.type === "invoice" ? "bg-purple-500" :
                  "bg-gray-400"
                }`} />
                <div>
                  <p className="text-sm text-gray-700">{activity.text}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions / insights */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label: "New Lead", color: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
              { label: "Schedule Job", color: "bg-green-50 text-green-700 hover:bg-green-100" },
              { label: "Create Quote", color: "bg-orange-50 text-orange-700 hover:bg-orange-100" },
              { label: "Send Invoice", color: "bg-purple-50 text-purple-700 hover:bg-purple-100" },
            ].map((action) => (
              <button
                key={action.label}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition ${action.color}`}
              >
                + {action.label}
              </button>
            ))}
          </div>

          <RequireRole roles={["business_owner"]}>
            <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <p className="text-sm font-semibold text-blue-900 mb-1">Revenue Trend</p>
              <p className="text-2xl font-bold text-blue-700">+18.2%</p>
              <p className="text-xs text-blue-600 mt-1">vs. last month</p>
            </div>
            <button
              onClick={() => navigate("/dashboard/reports")}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              <TrendingUp className="w-4 h-4" />
              View Full Reports
              <ArrowRight className="w-4 h-4" />
            </button>
          </RequireRole>
        </div>
      </div>
    </DashboardLayout>
  );
}
