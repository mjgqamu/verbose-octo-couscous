// SitePilot AI — Customer Portal Jobs List
// Route: /portal/jobs
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { JobStatusBadge } from "../../components/ui/JobStatusBadge";
import { Wrench, ChevronRight } from "lucide-react";

interface JobSummary {
  id: string;
  number: string;
  title: string | null;
  status: string;
  serviceType: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  priority: number;
  createdAt: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function CustomerJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.get<{ data: JobSummary[] }>(`/api/v1/orgs/${user.orgId}/customer/jobs`)
      .then((res) => {
        if (res.data) setJobs(res.data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Jobs</h1>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-40 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-56" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Jobs</h1>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No jobs yet</p>
          <p className="text-sm text-gray-400 mt-1">Your service jobs will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link
              key={job.id}
              to={`/portal/jobs/${job.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {job.title || `Job #${job.number}`}
                    </h3>
                    <JobStatusBadge status={job.status} size="sm" />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                    {job.serviceType && (
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">
                        {job.serviceType}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">#{job.number}</span>
                    {job.scheduledStart && (
                      <span className="text-xs text-gray-500">
                        {formatDate(job.scheduledStart)} · {formatTime(job.scheduledStart)}
                        {job.scheduledEnd && ` – ${formatTime(job.scheduledEnd)}`}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors ml-4 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
