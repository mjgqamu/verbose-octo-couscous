// SitePilot AI — Customer Portal Dashboard
// Route: /portal/dashboard
// Shows welcome message + 4 stat cards: Quotes, Appointments, Jobs, Invoices
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { FileText, Calendar, Wrench, DollarSign } from "lucide-react";

interface DashboardStats {
  pendingQuotes: number;
  nextAppointment: string | null;
  activeJobs: number;
  unpaidInvoices: number;
}

export function CustomerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    pendingQuotes: 0,
    nextAppointment: null,
    activeJobs: 0,
    unpaidInvoices: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function loadStats() {
      setLoading(true);
      try {
        const base = `/api/v1/orgs/${user!.orgId}/customer`;

        const [quotesRes, appointRes, jobsRes, invoicesRes] = await Promise.all([
          api.get<{ data: any[] }>(`${base}/quotes`),
          api.get<{ data: any[] }>(`${base}/appointments`),
          api.get<{ data: any[] }>(`${base}/jobs`),
          api.get<{ data: any[] }>(`${base}/invoices`),
        ]);

        const quotes = quotesRes.data?.data ?? [];
        const appointments = appointRes.data?.data ?? [];
        const jobs = jobsRes.data?.data ?? [];
        const invoices = invoicesRes.data?.data ?? [];

        // Next appointment (first future one)
        const now = new Date();
        const futureAppts = appointments
          .filter((a: any) => a.scheduledStart && new Date(a.scheduledStart) > now)
          .sort((a: any, b: any) =>
            new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
          );

        setStats({
          pendingQuotes: quotes.filter((q: any) =>
            q.status === "sent" || q.status === "viewed"
          ).length,
          nextAppointment: futureAppts.length > 0 ? futureAppts[0].scheduledStart : null,
          activeJobs: jobs.filter((j: any) =>
            j.status !== "completed" && j.status !== "cancelled"
          ).length,
          unpaidInvoices: invoices.filter((i: any) =>
            i.status !== "paid" && i.status !== "void"
          ).length,
        });
      } catch {
        // Silently fail — stats are non-critical
      }
      setLoading(false);
    }

    loadStats();
  }, [user]);

  const statCards = [
    {
      label: "My Quotes",
      value: stats.pendingQuotes,
      subtitle: "Pending",
      icon: FileText,
      color: "bg-blue-50 text-blue-600",
      link: "/portal/quotes",
    },
    {
      label: "My Appointments",
      value: stats.nextAppointment
        ? new Date(stats.nextAppointment).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "None",
      subtitle: stats.nextAppointment
        ? new Date(stats.nextAppointment).toLocaleDateString("en-US", { weekday: "long" })
        : "Upcoming",
      icon: Calendar,
      color: "bg-green-50 text-green-600",
      link: "/portal/appointments",
    },
    {
      label: "My Jobs",
      value: stats.activeJobs,
      subtitle: "Active",
      icon: Wrench,
      color: "bg-orange-50 text-orange-600",
      link: "/portal/jobs",
    },
    {
      label: "My Invoices",
      value: stats.unpaidInvoices,
      subtitle: "Unpaid",
      icon: DollarSign,
      color: "bg-red-50 text-red-600",
      link: "/portal/invoices",
    },
  ];

  return (
    <div>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome{user?.firstName ? `, ${user.firstName}` : ""}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Here&apos;s an overview of your account.
        </p>
      </div>

      {/* Stats grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="h-4 bg-gray-200 rounded w-20" />
                <div className="w-10 h-10 rounded-lg bg-gray-200" />
              </div>
              <div className="h-8 bg-gray-200 rounded w-12 mb-1" />
              <div className="h-3 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <Link
              key={card.label}
              to={card.link}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">{card.label}</span>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color} group-hover:scale-105 transition-transform`}>
                  <card.icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {typeof card.value === "number" ? card.value : card.value}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{card.subtitle}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/portal/quotes"
          className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition group"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">View Quotes</p>
            <p className="text-xs text-gray-500">Review and accept pending quotes</p>
          </div>
        </Link>
        <Link
          to="/portal/jobs"
          className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition group"
        >
          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Track Jobs</p>
            <p className="text-xs text-gray-500">See progress on active jobs</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
