// SitePilot AI — Appointment Detail Slide-over
import { useState } from "react";
import { api } from "../../lib/api";
import {
  X,
  Calendar,
  Clock,
  User,
  Wrench,
  Phone,
  Mail,
  FileText,
  MoreVertical,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";

interface Appointment {
  id: string;
  orgId: string;
  customerId: string;
  leadId?: string | null;
  title: string;
  description?: string | null;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  assignedTechnicians: string[];
  notes?: string | null;
  isAllDay: boolean;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  } | null;
}

interface AppointmentDetailProps {
  appointment: Appointment;
  orgId: string;
  onClose: () => void;
  onUpdated: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-800" },
  confirmed: { label: "Confirmed", color: "bg-blue-200 text-blue-900" },
  in_progress: { label: "In Progress", color: "bg-orange-100 text-orange-800" },
  completed: { label: "Completed", color: "bg-green-100 text-green-800" },
  no_show: { label: "No Show", color: "bg-red-100 text-red-800" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-500" },
};

export function AppointmentDetail({
  appointment,
  orgId,
  onClose,
  onUpdated,
}: AppointmentDetailProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString([], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusInfo = STATUS_LABELS[appointment.status] ?? {
    label: appointment.status,
    color: "bg-gray-100 text-gray-800",
  };

  const handleAction = async (action: "complete" | "cancel" | "reschedule") => {
    setActionLoading(action);
    setError(null);

    try {
      if (action === "complete") {
        await api.patch(`/api/v1/orgs/${orgId}/appointments/${appointment.id}`, {
          status: "completed",
        });
      } else if (action === "cancel") {
        await api.delete(`/api/v1/orgs/${orgId}/appointments/${appointment.id}`);
      }
      // Reschedule would open the modal — for now, just pass to parent
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />

      {/* Slide-over */}
      <div className="relative w-full max-w-md bg-white h-full shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">Appointment</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <MoreVertical className="w-5 h-5 text-gray-500" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleAction("complete");
                    }}
                    disabled={appointment.status === "completed" || appointment.status === "cancelled"}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Mark Complete
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleAction("cancel");
                    }}
                    disabled={appointment.status === "cancelled"}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel Appointment
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      // Parent handles reschedule by opening modal
                    }}
                    disabled={appointment.status === "cancelled"}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reschedule
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Title & Status */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              {actionLoading && (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900">{appointment.title}</h3>
          </div>

          {/* Date & Time */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">{formatDate(appointment.scheduledStart)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {formatTime(appointment.scheduledStart)} – {formatTime(appointment.scheduledEnd)}
                </p>
                <p className="text-xs text-gray-500">{appointment.timezone}</p>
              </div>
            </div>
          </div>

          {/* Customer */}
          {appointment.customer && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <p className="text-sm font-semibold text-gray-900">
                  {appointment.customer.firstName} {appointment.customer.lastName}
                </p>
              </div>
              {appointment.customer.phone && (
                <a
                  href={`tel:${appointment.customer.phone}`}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Phone className="w-4 h-4" />
                  {appointment.customer.phone}
                </a>
              )}
              {appointment.customer.email && (
                <a
                  href={`mailto:${appointment.customer.email}`}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Mail className="w-4 h-4" />
                  {appointment.customer.email}
                </a>
              )}
            </div>
          )}

          {/* Service Type */}
          {appointment.title && (
            <div className="flex items-start gap-3">
              <Wrench className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-gray-500">Service</p>
                <p className="text-sm font-medium text-gray-900">{appointment.title}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          {(appointment.notes || appointment.description) && (
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-gray-500">Notes</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {appointment.notes || appointment.description}
                </p>
              </div>
            </div>
          )}

          {/* Quick actions */}
          {appointment.status !== "cancelled" && appointment.status !== "completed" && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleAction("complete")}
                disabled={!!actionLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Complete
              </button>
              <button
                onClick={() => handleAction("cancel")}
                disabled={!!actionLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-red-600 text-sm font-medium border border-red-200 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
