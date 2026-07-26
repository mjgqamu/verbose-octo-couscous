// SitePilot AI — Customer Portal Job Detail
// Route: /portal/jobs/:id
// Status stepper, photo grid, activity timeline, service details
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { JobStatusBadge } from "../../components/ui/JobStatusBadge";
import { ActivityTimeline } from "../../components/ui/ActivityTimeline";
import type { Activity } from "../../components/ui/ActivityTimeline";
import { ArrowLeft, Clock, Camera, ImageOff } from "lucide-react";

interface JobPhoto {
  id: string;
  url: string;
  caption: string | null;
  photoType: string | null;
  createdAt: string;
}

interface JobDetail {
  id: string;
  number: string;
  title: string | null;
  description: string | null;
  status: string;
  priority: number;
  serviceType: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  estimatedHours: string | null;
  actualHours: string | null;
  notes: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  activities: Activity[];
  photos: JobPhoto[];
}

const STEP_ORDER = ["scheduled", "assigned", "in_progress", "completed"];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function CustomerJobDetail() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    setLoading(true);
    api.get<{ data: JobDetail }>(`/api/v1/orgs/${user.orgId}/customer/jobs/${id}`)
      .then((res) => {
        if (res.data) setJob(res.data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user, id]);

  if (loading) {
    return (
      <div>
        <div className="mb-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-20 mb-4" />
          <div className="h-8 bg-gray-200 rounded w-56" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-32" />
          <div className="h-4 bg-gray-200 rounded w-full" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div>
        <Link to="/portal/jobs" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Jobs
        </Link>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Job not found.</p>
        </div>
      </div>
    );
  }

  const currentStepIdx = job.status === "cancelled" ? -1 : STEP_ORDER.indexOf(job.status);

  return (
    <div>
      {/* Back */}
      <Link to="/portal/jobs" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition">
        <ArrowLeft className="w-4 h-4" /> Back to Jobs
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-gray-900">
            {job.title || `Job #${job.number}`}
          </h1>
          <JobStatusBadge status={job.status} />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
          <span>#{job.number}</span>
          {job.serviceType && (
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">
              {job.serviceType}
            </span>
          )}
          {job.scheduledStart && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDate(job.scheduledStart)} · {formatTime(job.scheduledStart)}
              {job.scheduledEnd && ` – ${formatTime(job.scheduledEnd)}`}
            </span>
          )}
        </div>
      </div>

      {/* Status stepper */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Progress</h3>
        {job.status === "cancelled" ? (
          <div className="flex items-center gap-2 text-red-600">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <span className="text-sm font-medium">Job was cancelled</span>
          </div>
        ) : (
          <div className="flex items-center">
            {["Scheduled", "Assigned", "In Progress", "Completed"].map((label, idx) => {
              const isCompleted = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <div key={label} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCompleted
                          ? "bg-green-500 text-white"
                          : isCurrent
                          ? "bg-blue-600 text-white ring-4 ring-blue-100"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span
                      className={`text-xs mt-1.5 font-medium whitespace-nowrap ${
                        isCurrent ? "text-blue-600" : isCompleted ? "text-green-600" : "text-gray-400"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {idx < 3 && (
                    <div className="flex-1 h-0.5 mx-2 mb-4">
                      <div
                        className={`h-full rounded-full transition-colors ${
                          isCompleted ? "bg-green-500" : "bg-gray-200"
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service description */}
          {job.description && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Service Details</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{job.description}</p>
            </div>
          )}

          {/* Job details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Job Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs">Scheduled</p>
                <p className="text-gray-900">
                  {job.scheduledStart ? `${formatDate(job.scheduledStart)} ${formatTime(job.scheduledStart)}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Priority</p>
                <p className="text-gray-900 capitalize">{job.priority === 1 ? "High" : job.priority === 2 ? "Medium" : "Low"}</p>
              </div>
              {job.estimatedHours && (
                <div>
                  <p className="text-gray-400 text-xs">Estimated Hours</p>
                  <p className="text-gray-900">{job.estimatedHours}</p>
                </div>
              )}
              {job.actualHours && (
                <div>
                  <p className="text-gray-400 text-xs">Actual Hours</p>
                  <p className="text-gray-900">{job.actualHours}</p>
                </div>
              )}
              {job.completedAt && (
                <div>
                  <p className="text-gray-400 text-xs">Completed</p>
                  <p className="text-gray-900">{formatDate(job.completedAt)} {formatTime(job.completedAt)}</p>
                </div>
              )}
              {job.createdAt && (
                <div>
                  <p className="text-gray-400 text-xs">Created</p>
                  <p className="text-gray-900">{formatDate(job.createdAt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Photos */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Camera className="w-4 h-4 text-gray-400" />
              Photos
              {job.photos.length > 0 && (
                <span className="text-xs text-gray-400 font-normal">({job.photos.length})</span>
              )}
            </h3>
            {job.photos.length === 0 ? (
              <div className="py-6 text-center">
                <ImageOff className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No photos yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {job.photos.map((photo) => (
                  <div key={photo.id} className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-square">
                    {photo.url ? (
                      <img
                        src={photo.url}
                        alt={photo.caption ?? "Job photo"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                    ) : null}
                    <div className={`${photo.url ? "hidden" : ""} w-full h-full flex items-center justify-center`}>
                      <ImageOff className="w-8 h-8 text-gray-300" />
                    </div>
                    {photo.caption && (
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <p className="text-white text-xs font-medium truncate">{photo.caption}</p>
                      </div>
                    )}
                    {photo.photoType && (
                      <span className="absolute top-2 left-2 bg-white/90 text-gray-700 text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase">
                        {photo.photoType}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: activity timeline */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Activity</h3>
          <ActivityTimeline
            activities={job.activities}
            emptyMessage="No activity recorded yet"
          />
        </div>
      </div>
    </div>
  );
}
