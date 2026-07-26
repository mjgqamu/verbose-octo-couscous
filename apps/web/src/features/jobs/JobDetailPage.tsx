import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { DashboardLayout } from "../dashboard/DashboardLayout";
import { JobStatusBadge } from "../../components/ui/JobStatusBadge";
import { ActivityTimeline } from "../../components/ui/ActivityTimeline";
import type { Activity } from "../../components/ui/ActivityTimeline";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Wrench,
  Phone,
  Mail,
  Plus,
  Image,
  MessageSquare,
} from "lucide-react";

const JOB_STATUSES = ["new", "scheduled", "assigned", "in_progress", "waiting", "completed", "cancelled"];

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface JobPhoto {
  id: string;
  url: string;
  caption?: string | null;
  takenAt?: string | null;
}

interface JobDetail {
  id: string;
  number: string;
  title: string;
  description?: string | null;
  status: string;
  priority: number;
  serviceType?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  actualStart?: string | null;
  actualEnd?: string | null;
  assignedTechs?: string[] | null;
  estimatedHours?: string | null;
  actualHours?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
  tags?: string[] | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    addressLine1?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
  technicians?: Technician[];
  activities: Activity[];
  photos: JobPhoto[];
  lead?: {
    id: string;
    contactName?: string | null;
    contactPhone?: string | null;
    stage: string;
    title?: string | null;
  } | null;
}

export function JobDetailPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [showPhotoInput, setShowPhotoInput] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoType, setPhotoType] = useState<"before" | "after" | "progress">("progress");
  const [addingPhoto, setAddingPhoto] = useState(false);

  const isTechnician = user?.role === "technician";

  // Redirect technician to simplified view
  useEffect(() => {
    if (isTechnician && id) {
      navigate(`/dashboard/technician/jobs/${id}`, { replace: true });
    }
  }, [isTechnician, id, navigate]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get<{ data: JobDetail }>(`/api/v1/orgs/${user!.orgId}/jobs/${id}`).then((res) => {
      if (res.data) setJob(res.data.data);
      setLoading(false);
    });
  }, [id, user]);

  const handleStatusChange = async (newStatus: string) => {
    if (!job) return;
    setStatusUpdating(true);
    const res = await api.patch<{ data: JobDetail }>(`/api/v1/orgs/${user!.orgId}/jobs/${job.id}`, {
      status: newStatus,
    });
    if (res.data) {
      setJob(res.data.data as unknown as JobDetail);
    } else if (res.error) {
      alert(res.error.message);
    }
    setStatusUpdating(false);
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !job) return;
    setAddingNote(true);
    const res = await api.post(`/api/v1/orgs/${user!.orgId}/jobs/${job.id}/activities`, {
      activityType: "note",
      description: noteText.trim(),
    });
    if (res.data) {
      setJob({
        ...job,
        activities: [res.data as unknown as Activity, ...job.activities],
      });
      setNoteText("");
      setShowNoteInput(false);
    }
    setAddingNote(false);
  };

  const handleAddPhoto = async () => {
    if (!photoUrl.trim() || !job) return;
    setAddingPhoto(true);
    const res = await api.post(`/api/v1/orgs/${user!.orgId}/jobs/${job.id}/photos`, {
      url: photoUrl.trim(),
      caption: photoCaption.trim() || undefined,
      photoType,
    });
    if (res.data) {
      setJob({
        ...job,
        photos: [res.data as unknown as JobPhoto, ...job.photos],
      });
      setPhotoUrl("");
      setPhotoCaption("");
      setShowPhotoInput(false);
    }
    setAddingPhoto(false);
  };

  const currentStatusIndex = JOB_STATUSES.indexOf(job?.status ?? "");

  const canEditStatus = !isTechnician || (isTechnician && job?.status !== "completed" && job?.status !== "cancelled");

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-40 bg-gray-200 rounded-xl" />
              <div className="h-60 bg-gray-200 rounded-xl" />
            </div>
            <div className="h-80 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!job) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <p className="text-gray-500">Job not found.</p>
          <button onClick={() => navigate("/dashboard/jobs")} className="mt-4 text-blue-600 hover:underline text-sm font-medium">Back to jobs</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Breadcrumb */}
      <button
        onClick={() => navigate("/dashboard/jobs")}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Jobs
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {job.title}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5 font-mono">{job.number}</p>
        </div>
        <div className="flex items-center gap-2">
          <JobStatusBadge status={job.status} />
          {canEditStatus && (
            <select
              value={job.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={statusUpdating}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50"
            >
              {JOB_STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content: left 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status progression tracker */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Job Progress</h3>
            <div className="flex items-center gap-1">
              {JOB_STATUSES.map((status, idx) => {
                const isPast = idx < currentStatusIndex;
                const isCurrent = idx === currentStatusIndex;
                const isCancelled = status === "cancelled" && isCurrent;

                return (
                  <div key={status} className="flex-1 flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                          isCancelled
                            ? "bg-red-100 text-red-700 border-2 border-red-300"
                            : isPast
                            ? "bg-green-500 text-white"
                            : isCurrent
                            ? "bg-blue-600 text-white ring-4 ring-blue-100"
                            : "bg-gray-100 text-gray-400"
                        }`}
                        title={status.replace(/_/g, " ")}
                      >
                        {isPast ? "✓" : idx + 1}
                      </div>
                      <span className={`text-[10px] mt-1 font-medium text-center ${isCurrent ? "text-blue-600" : "text-gray-400"}`}>
                        {status === "waiting" ? "Waiting" : status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    </div>
                    {idx < JOB_STATUSES.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 mb-5 ${idx < currentStatusIndex ? "bg-green-500" : "bg-gray-200"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Job info card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Job Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoItem icon={<User className="w-4 h-4" />} label="Customer" value={
                job.customer ? (
                  <button
                    onClick={() => navigate(`/dashboard/customers/${job.customer!.id}`)}
                    className="text-blue-600 hover:underline"
                  >
                    {job.customer.firstName} {job.customer.lastName}
                    {job.customer.company && ` (${job.customer.company})`}
                  </button>
                ) : "—"
              } />
              <InfoItem icon={<Wrench className="w-4 h-4" />} label="Service Type" value={job.serviceType || "—"} />
              <InfoItem icon={<Calendar className="w-4 h-4" />} label="Scheduled Start" value={job.scheduledStart ? new Date(job.scheduledStart).toLocaleString() : "—"} />
              <InfoItem icon={<Clock className="w-4 h-4" />} label="Scheduled End" value={job.scheduledEnd ? new Date(job.scheduledEnd).toLocaleString() : "—"} />
              {job.actualStart && (
                <InfoItem icon={<Clock className="w-4 h-4" />} label="Actual Start" value={new Date(job.actualStart).toLocaleString()} />
              )}
              {job.actualEnd && (
                <InfoItem icon={<Clock className="w-4 h-4" />} label="Actual End" value={new Date(job.actualEnd).toLocaleString()} />
              )}
              <InfoItem icon={<User className="w-4 h-4" />} label="Technicians" value={
                job.technicians && job.technicians.length > 0
                  ? job.technicians.map(t => `${t.firstName} ${t.lastName}`).join(", ")
                  : "Unassigned"
              } />
              {(job.addressLine1 || job.city) && (
                <InfoItem icon={<MapPin className="w-4 h-4" />} label="Location" value={
                  [job.addressLine1, job.city, job.state].filter(Boolean).join(", ") || "—"
                } />
              )}
              {job.estimatedHours && (
                <InfoItem icon={<Clock className="w-4 h-4" />} label="Est. Hours" value={job.estimatedHours} />
              )}
              {job.actualHours && (
                <InfoItem icon={<Clock className="w-4 h-4" />} label="Actual Hours" value={job.actualHours} />
              )}
            </div>

            {job.description && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Description</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.description}</p>
              </div>
            )}

            {job.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.notes}</p>
              </div>
            )}

            {job.cancelReason && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Cancel Reason</p>
                <p className="text-sm text-red-600">{job.cancelReason}</p>
              </div>
            )}
          </div>

          {/* Photos */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Photos</h3>
              <button
                onClick={() => setShowPhotoInput(!showPhotoInput)}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Photo
              </button>
            </div>

            {showPhotoInput && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Photo URL</label>
                  <input
                    type="url"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    placeholder="https://example.com/photo.jpg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Caption (optional)</label>
                  <input
                    type="text"
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    placeholder="e.g. Front view before repair"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={photoType}
                    onChange={(e) => setPhotoType(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="before">Before</option>
                    <option value="progress">Progress</option>
                    <option value="after">After</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setShowPhotoInput(false); setPhotoUrl(""); setPhotoCaption(""); }}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddPhoto}
                    disabled={!photoUrl.trim() || addingPhoto}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition disabled:opacity-50"
                  >
                    {addingPhoto ? "Adding..." : "Add Photo"}
                  </button>
                </div>
              </div>
            )}

            {job.photos.length === 0 ? (
              <div className="py-8 text-center">
                <Image className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No photos yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {job.photos.map((photo) => (
                  <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                    <img
                      src={photo.url}
                      alt={photo.caption || "Job photo"}
                      className="w-full h-32 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect fill='%23f3f4f6' width='100' height='100'/><text x='50' y='50' text-anchor='middle' dy='.3em' fill='%239ca3af' font-size='12'>No Image</text></svg>";
                      }}
                    />
                    {photo.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                        <p className="text-xs text-white truncate">{photo.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Activity</h3>
              <button
                onClick={() => setShowNoteInput(!showNoteInput)}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Note
              </button>
            </div>

            {showNoteInput && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none bg-white"
                  placeholder="Add a note..."
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => { setShowNoteInput(false); setNoteText(""); }}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddNote}
                    disabled={!noteText.trim() || addingNote}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition disabled:opacity-50"
                  >
                    {addingNote ? "Saving..." : "Save Note"}
                  </button>
                </div>
              </div>
            )}

            <ActivityTimeline activities={job.activities} emptyMessage="No activity yet" />
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Customer card */}
          {job.customer && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Customer</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                  {job.customer.firstName[0]}{job.customer.lastName[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{job.customer.firstName} {job.customer.lastName}</p>
                  {job.customer.company && <p className="text-xs text-gray-500">{job.customer.company}</p>}
                </div>
              </div>
              <div className="space-y-2">
                {job.customer.email && (
                  <a href={`mailto:${job.customer.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition">
                    <Mail className="w-4 h-4 text-gray-400" /> {job.customer.email}
                  </a>
                )}
                {job.customer.phone && (
                  <a href={`tel:${job.customer.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition">
                    <Phone className="w-4 h-4 text-gray-400" /> {job.customer.phone}
                  </a>
                )}
                {job.customer.addressLine1 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400" /> {job.customer.addressLine1}, {job.customer.city}, {job.customer.state}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lead info */}
          {job.lead && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Source Lead</h3>
              <p className="text-sm text-gray-700">
                {job.lead.contactName || job.lead.title || "Lead"}
              </p>
              {job.lead.contactPhone && (
                <p className="text-xs text-gray-500 mt-1">{job.lead.contactPhone}</p>
              )}
              <button
                onClick={() => navigate(`/dashboard/leads/${job.lead!.id}`)}
                className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                View Lead →
              </button>
            </div>
          )}

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {job.customer?.phone && (
                <a href={`tel:${job.customer.phone}`} className="w-full text-left px-3 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Call Customer
                </a>
              )}
              {job.customer?.email && (
                <a href={`mailto:${job.customer.email}`} className="w-full text-left px-3 py-2.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Email Customer
                </a>
              )}
              <button
                onClick={() => setShowNoteInput(true)}
                className="w-full text-left px-3 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" /> Add Note
              </button>
              <button
                onClick={() => setShowPhotoInput(true)}
                className="w-full text-left px-3 py-2.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition flex items-center gap-2"
              >
                <Image className="w-4 h-4" /> Add Photo
              </button>
            </div>
          </div>

          {/* Tech info */}
          {job.technicians && job.technicians.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Assigned Technicians</h3>
              <div className="space-y-2">
                {job.technicians.map((tech) => (
                  <div key={tech.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 text-sm font-bold">
                      {tech.firstName[0]}{tech.lastName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tech.firstName} {tech.lastName}</p>
                      <p className="text-xs text-gray-500">{tech.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode | string | null | undefined }) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-gray-400 mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <div className="text-sm text-gray-900">{value || <span className="text-gray-400">—</span>}</div>
      </div>
    </div>
  );
}
