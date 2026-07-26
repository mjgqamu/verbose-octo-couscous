import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { DashboardLayout } from "../dashboard/DashboardLayout";
import { JobStatusBadge } from "../../components/ui/JobStatusBadge";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Wrench,
  Phone,
  Navigation,
  Play,
  CheckCircle2,
} from "lucide-react";

interface JobSummary {
  id: string;
  number: string;
  title: string;
  status: string;
  serviceType?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    company?: string | null;
  } | null;
}

interface TechnicianStats {
  jobsToday: number;
  completed: number;
  remaining: number;
}

export function TechnicianDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [stats, setStats] = useState<TechnicianStats>({ jobsToday: 0, completed: 0, remaining: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const today = new Date().toISOString().split("T")[0];
    const params = new URLSearchParams({
      status: "scheduled,assigned,in_progress,waiting",
      sortBy: "scheduledStart",
      sortDir: "asc",
      limit: "50",
    });

    api
      .get<{ data: JobSummary[]; pagination: { total: number } }>(
        `/api/v1/orgs/${user.orgId}/jobs?${params.toString()}`
      )
      .then((res) => {
        if (res.data) {
          const jobList = res.data.data;
          setJobs(jobList);
          const completed = jobList.filter((j) => j.status === "completed").length;
          const remaining = jobList.filter((j) => j.status !== "completed" && j.status !== "cancelled").length;
          setStats({
            jobsToday: jobList.length,
            completed,
            remaining,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const formatTime = (iso: string | null | undefined): string => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const formatAddress = (job: JobSummary): string => {
    const parts = [job.addressLine1, job.city, job.state].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "—";
  };

  const mapsUrl = (job: JobSummary): string | null => {
    const addr = formatAddress(job);
    if (addr === "—") return null;
    return `https://maps.google.com/?q=${encodeURIComponent(addr)}`;
  };

  const isActionable = (status: string) =>
    ["scheduled", "assigned", "in_progress", "waiting"].includes(status);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-56" />
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Today's Jobs</h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={<Wrench className="w-5 h-5" />}
          label="Total Jobs"
          value={String(stats.jobsToday)}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Completed"
          value={String(stats.completed)}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Remaining"
          value={String(stats.remaining)}
          color="bg-orange-50 text-orange-600"
        />
      </div>

      {/* Empty state */}
      {jobs.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No jobs scheduled for today</h3>
          <p className="text-sm text-gray-500">You're all caught up! Check back for new assignments.</p>
        </div>
      )}

      {/* Job cards */}
      <div className="space-y-3">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onTap={() => navigate(`/dashboard/jobs/${job.id}`)}
            mapsUrl={mapsUrl(job)}
            formatTime={formatTime}
            isActionable={isActionable}
          />
        ))}
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{label}</span>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function JobCard({
  job,
  onTap,
  mapsUrl,
  formatTime,
  isActionable,
}: {
  job: JobSummary;
  onTap: () => void;
  mapsUrl: string | null;
  formatTime: (iso: string | null | undefined) => string;
  isActionable: (status: string) => boolean;
}) {
  const customerName = job.customer
    ? `${job.customer.firstName} ${job.customer.lastName}`
    : "Unknown Customer";

  return (
    <div
      onClick={onTap}
      className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 hover:shadow-md hover:border-blue-200 transition cursor-pointer active:bg-gray-50"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-gray-400">{job.number}</span>
            <JobStatusBadge status={job.status} size="sm" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 truncate">{job.title}</h3>

          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{customerName}</span>
            </div>
            {job.addressLine1 && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="truncate">
                  {[job.addressLine1, job.city].filter(Boolean).join(", ")}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>
                {formatTime(job.scheduledStart)}
                {job.scheduledEnd ? ` — ${formatTime(job.scheduledEnd)}` : ""}
              </span>
              {job.serviceType && (
                <span className="text-xs text-gray-400 ml-1">· {job.serviceType}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: quick actions */}
        <div className="flex items-center gap-2 sm:flex-col sm:items-stretch shrink-0">
          {isActionable(job.status) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTap();
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
              title={job.status === "in_progress" ? "Continue job" : "Start Job"}
            >
              <Play className="w-4 h-4" />
              <span className="sm:hidden lg:inline">
                {job.status === "in_progress" ? "Continue" : "Start"}
              </span>
            </button>
          )}

          {job.customer?.phone && (
            <a
              href={`tel:${job.customer.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition"
              title="Call"
            >
              <Phone className="w-4 h-4" />
            </a>
          )}

          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition"
              title="Navigate"
            >
              <Navigation className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
