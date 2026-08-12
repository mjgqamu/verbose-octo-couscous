import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { DashboardLayout } from "../dashboard/DashboardLayout";
import { JobStatusBadge } from "../../components/ui/JobStatusBadge";
import { SignaturePad } from "../../components/ui/SignaturePad";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Navigation,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wrench,
  Camera,
  Plus,
  X,
  Image,
} from "lucide-react";

// ---- Types ----
interface JobPhoto {
  id: string;
  url: string;
  caption?: string | null;
  takenAt?: string | null;
  photoType?: string | null;
}

interface JobDetail {
  id: string;
  number: string;
  title: string;
  description?: string | null;
  status: string;
  serviceType?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  actualStart?: string | null;
  actualEnd?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  notes?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
  } | null;
  photos: JobPhoto[];
}

// ---- Completion checklist items ----
const DEFAULT_CHECKLIST = [
  { key: "area_cleaned", label: "Work area cleaned" },
  { key: "customer_signoff", label: "Customer signed off" },
  { key: "materials_accounted", label: "Materials accounted for" },
  { key: "photos_taken", label: "Photos taken" },
];

export function TechnicianJobView() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Job state
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Note state
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Photo state
  const [showPhotoInput, setShowPhotoInput] = useState(false);
  const [photoType, setPhotoType] = useState<"before" | "after">("before");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState("");
  const [addingPhoto, setAddingPhoto] = useState(false);

  // Checklist
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [customChecklistItems, setCustomChecklistItems] = useState<string[]>([]);
  const [newCustomItem, setNewCustomItem] = useState("");

  // Signature
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Fetch job
  useEffect(() => {
    if (!id || !user) return;
    setLoading(true);
    api
      .get<{ data: JobDetail }>(`/api/v1/orgs/${user.orgId}/jobs/${id}`)
      .then((res) => {
        if (res.data) setJob(res.data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, user]);

  // Address helpers
  const fullAddress = job
    ? [job.addressLine1, job.addressLine2, job.city, job.state, job.postalCode]
        .filter(Boolean)
        .join(", ")
    : "";

  const mapsUrl = fullAddress
    ? `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`
    : null;

  const formatDateTime = (iso: string | null | undefined): string => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // ---- Status actions ----
  const handleStatusChange = async (newStatus: string) => {
    if (!job || !user) return;
    setStatusUpdating(true);
    const res = await api.patch<{ data: JobDetail }>(
      `/api/v1/orgs/${user.orgId}/jobs/${job.id}`,
      { status: newStatus }
    );
    if (res.data) {
      setJob(res.data.data as unknown as JobDetail);
    } else if (res.error) {
      alert(res.error.message);
    }
    setStatusUpdating(false);
  };

  // ---- Notes ----
  const handleAddNote = async () => {
    if (!noteText.trim() || !job || !user) return;
    setAddingNote(true);
    const res = await api.post(
      `/api/v1/orgs/${user.orgId}/jobs/${job.id}/activities`,
      { activityType: "note", description: noteText.trim() }
    );
    if (res.data) {
      setJob({ ...job });
      setNoteText("");
    }
    setAddingNote(false);
  };

  // ---- Photos ----
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);

    // Generate preview as data URL
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddPhoto = async () => {
    if ((!photoPreview && !photoFile) || !job || !user) return;
    setAddingPhoto(true);

    // Use data URL as photo URL (no S3 for now)
    const url = photoPreview || "";

    const res = await api.post(
      `/api/v1/orgs/${user.orgId}/jobs/${job.id}/photos`,
      {
        url,
        caption: photoCaption.trim() || `${photoType} photo`,
        photoType,
      }
    );
    if (res.data) {
      const newPhoto = res.data as unknown as JobPhoto;
      setJob({
        ...job,
        photos: [newPhoto, ...job.photos],
      });
      setPhotoFile(null);
      setPhotoPreview(null);
      setPhotoCaption("");
      setShowPhotoInput(false);
    }
    setAddingPhoto(false);
  };

  const handleTakePhoto = () => {
    // Trigger hidden file input with camera capture
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // ---- Checklist ----
  const toggleChecklistItem = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allChecked = (): boolean => {
    const defaultChecked = DEFAULT_CHECKLIST.every((item) => checklist[item.key]);
    const customChecked = customChecklistItems.every(
      (_item, idx) => checklist[`custom_${idx}`]
    );
    return defaultChecked && customChecked;
  };

  const addCustomItem = () => {
    if (!newCustomItem.trim()) return;
    setCustomChecklistItems((prev) => [...prev, newCustomItem.trim()]);
    setNewCustomItem("");
  };

  const canStart = job?.status === "scheduled" || job?.status === "assigned" || job?.status === "new";
  const canHold = job?.status === "in_progress";
  const canComplete = job?.status === "in_progress" || job?.status === "waiting";
  const isCompleted = job?.status === "completed";
  const isCancelled = job?.status === "cancelled";
  const isReadOnly = isCompleted || isCancelled;

  // ---- Loading ----
  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-40 bg-gray-200 rounded-xl" />
          <div className="h-32 bg-gray-200 rounded-xl" />
          <div className="h-48 bg-gray-200 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  // ---- Not found ----
  if (!job) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <p className="text-gray-500">Job not found.</p>
          <button
            onClick={() => navigate("/dashboard/technician")}
            className="mt-4 text-blue-600 hover:underline text-sm font-medium"
          >
            Back to dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Breadcrumb */}
      <button
        onClick={() => navigate("/dashboard/technician")}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{job.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-xs text-gray-400">{job.number}</span>
            <JobStatusBadge status={job.status} />
          </div>
        </div>
      </div>

      {/* ---- STATUS ACTIONS (prominent buttons) ---- */}
      {!isReadOnly && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {canStart && (
            <button
              onClick={() => handleStatusChange("in_progress")}
              disabled={statusUpdating}
              className="flex flex-col items-center justify-center gap-1.5 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
            >
              <Play className="w-6 h-6" />
              <span className="text-sm font-semibold">Start Job</span>
            </button>
          )}

          {canHold && (
            <button
              onClick={() => handleStatusChange("waiting")}
              disabled={statusUpdating}
              className="flex flex-col items-center justify-center gap-1.5 py-4 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition shadow-sm disabled:opacity-50"
            >
              <Pause className="w-6 h-6" />
              <span className="text-sm font-semibold">On Hold</span>
            </button>
          )}

          {canComplete && (
            <button
              onClick={() => handleStatusChange("completed")}
              disabled={statusUpdating || !allChecked()}
              className="flex flex-col items-center justify-center gap-1.5 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title={!allChecked() ? "Complete checklist before marking job done" : undefined}
            >
              <CheckCircle2 className="w-6 h-6" />
              <span className="text-sm font-semibold">Complete</span>
            </button>
          )}

          {job.status === "in_progress" && !canStart && (
            <button
              onClick={() => handleStatusChange("in_progress")}
              disabled={true}
              className="flex flex-col items-center justify-center gap-1.5 py-4 bg-blue-100 text-blue-400 rounded-xl cursor-not-allowed"
            >
              <Play className="w-6 h-6" />
              <span className="text-sm font-semibold">In Progress</span>
            </button>
          )}
        </div>
      )}

      {/* Completed / Cancelled banner */}
      {isCompleted && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
          <p className="text-green-800 font-semibold">Job Completed</p>
          <p className="text-green-600 text-sm mt-1">
            {job.completedAt ? `Completed ${formatDateTime(job.completedAt)}` : ""}
          </p>
        </div>
      )}

      {isCancelled && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <p className="text-red-800 font-semibold">Job Cancelled</p>
          {job.cancelReason && (
            <p className="text-red-600 text-sm mt-1">{job.cancelReason}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* ---- Job Info ---- */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Job Details</h3>

            {/* Customer */}
            {job.customer && (
              <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold shrink-0">
                  {job.customer.firstName[0]}
                  {job.customer.lastName[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {job.customer.firstName} {job.customer.lastName}
                  </p>
                  {job.customer.company && (
                    <p className="text-xs text-gray-500">{job.customer.company}</p>
                  )}
                </div>
                {job.customer.phone && (
                  <a
                    href={`tel:${job.customer.phone}`}
                    className="shrink-0 inline-flex items-center justify-center w-10 h-10 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition"
                  >
                    <Phone className="w-5 h-5" />
                  </a>
                )}
              </div>
            )}

            <div className="space-y-3">
              <DetailRow icon={<Wrench />} label="Service Type" value={job.serviceType || "—"} />
              <DetailRow
                icon={<Clock />}
                label="Scheduled"
                value={`${formatDateTime(job.scheduledStart)}${job.scheduledEnd ? ` — ${formatDateTime(job.scheduledEnd)}` : ""}`}
              />
              <DetailRow icon={<MapPin />} label="Address" value={fullAddress || "—"} />
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium mt-1"
                >
                  <Navigation className="w-4 h-4" /> Navigate to address
                </a>
              )}
              {job.description && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500 font-medium mb-1">Description</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* ---- Photos ---- */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Photos</h3>
              {!isReadOnly && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTakePhoto}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                  >
                    <Camera className="w-3.5 h-3.5" /> Take Photo
                  </button>
                  <button
                    onClick={() => {
                      setShowPhotoInput(!showPhotoInput);
                      setPhotoPreview(null);
                      setPhotoFile(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Upload
                  </button>
                </div>
              )}
            </div>

            {/* Photo upload form */}
            {showPhotoInput && !isReadOnly && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-3">
                {/* Before/After toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-700">Type:</span>
                  <button
                    onClick={() => setPhotoType("before")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                      photoType === "before"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-600 border border-gray-200"
                    }`}
                  >
                    Before
                  </button>
                  <button
                    onClick={() => setPhotoType("after")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                      photoType === "after"
                        ? "bg-green-600 text-white"
                        : "bg-white text-gray-600 border border-gray-200"
                    }`}
                  >
                    After
                  </button>
                </div>

                {/* File picker */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Choose Photo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-white file:text-gray-700 file:hover:bg-gray-100"
                  />
                </div>

                {photoPreview && (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full h-40 object-cover rounded-lg border border-blue-200"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Caption (optional)
                  </label>
                  <input
                    type="text"
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. Work area before starting"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowPhotoInput(false);
                      setPhotoPreview(null);
                      setPhotoFile(null);
                      setPhotoCaption("");
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddPhoto}
                    disabled={!photoPreview || addingPhoto}
                    className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition disabled:opacity-50"
                  >
                    {addingPhoto ? "Saving..." : "Save Photo"}
                  </button>
                </div>
              </div>
            )}

            {/* Photo grid */}
            {job.photos.length === 0 ? (
              <div className="py-8 text-center">
                <Image className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No photos yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {job.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-100"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || "Job photo"}
                      className="w-full h-32 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect fill='%23f3f4f6' width='100' height='100'/><text x='50' y='50' text-anchor='middle' dy='.3em' fill='%239ca3af' font-size='12'>No Image</text></svg>";
                      }}
                    />
                    {photo.photoType && (
                      <span
                        className={`absolute top-2 left-2 px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                          photo.photoType === "before"
                            ? "bg-blue-100 text-blue-700"
                            : photo.photoType === "after"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {photo.photoType === "before" ? "Before" : photo.photoType === "after" ? "After" : ""}
                      </span>
                    )}
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

          {/* ---- Quick-add note ---- */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Add Note</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                disabled={isReadOnly}
                className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-400"
                placeholder="Quick note about this job..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && noteText.trim()) handleAddNote();
                }}
              />
              <button
                onClick={handleAddNote}
                disabled={!noteText.trim() || addingNote || isReadOnly}
                className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 shrink-0"
              >
                {addingNote ? "..." : "Add Note"}
              </button>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* ---- Completion Checklist ---- */}
          {!isReadOnly && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Completion Checklist</h3>
                <span className="text-xs text-gray-400">
                  {Object.values(checklist).filter(Boolean).length}/{DEFAULT_CHECKLIST.length + customChecklistItems.length} done
                </span>
              </div>

              <div className="space-y-2">
                {DEFAULT_CHECKLIST.map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={!!checklist[item.key]}
                      onChange={() => toggleChecklistItem(item.key)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{item.label}</span>
                  </label>
                ))}

                {customChecklistItems.map((item, idx) => (
                  <label
                    key={`custom_${idx}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={!!checklist[`custom_${idx}`]}
                      onChange={() => toggleChecklistItem(`custom_${idx}`)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 flex-1">{item}</span>
                    <button
                      onClick={() => {
                        setCustomChecklistItems((prev) => prev.filter((_, i) => i !== idx));
                      }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </label>
                ))}

                {/* Add custom item */}
                <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                  <input
                    type="text"
                    value={newCustomItem}
                    onChange={(e) => setNewCustomItem(e.target.value)}
                    placeholder="Add custom item..."
                    className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addCustomItem();
                    }}
                  />
                  <button
                    onClick={addCustomItem}
                    disabled={!newCustomItem.trim()}
                    className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ---- Signature Pad ---- */}
          {!isReadOnly && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Customer Signature</h3>
              </div>

              {!showSignaturePad && !signatureData && (
                <button
                  onClick={() => setShowSignaturePad(true)}
                  className="w-full py-3 text-sm font-medium text-blue-600 border-2 border-dashed border-blue-200 rounded-xl hover:bg-blue-50 transition"
                >
                  Open Signature Pad
                </button>
              )}

              {!showSignaturePad && signatureData && (
                <div className="space-y-2">
                  <img
                    src={signatureData}
                    alt="Customer signature"
                    className="w-full h-24 object-contain border border-gray-200 rounded-lg bg-gray-50"
                  />
                  <button
                    onClick={() => setShowSignaturePad(true)}
                    className="w-full py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    Re-sign
                  </button>
                </div>
              )}

              {showSignaturePad && (
                <SignaturePad
                  onSave={(dataUrl) => {
                    setSignatureData(dataUrl);
                    setShowSignaturePad(false);
                  }}
                  onCancel={() => setShowSignaturePad(false)}
                />
              )}
            </div>
          )}

          {/* ---- Quick actions ---- */}
          {job.customer && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                {job.customer.phone && (
                  <a
                    href={`tel:${job.customer.phone}`}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition flex items-center gap-2"
                  >
                    <Phone className="w-4 h-4" /> Call Customer
                  </a>
                )}
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition flex items-center gap-2"
                  >
                    <Navigation className="w-4 h-4" /> Navigate
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

// ---- Helpers ----
function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-gray-400 mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-sm text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}
