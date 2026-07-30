// SitePilot AI — Automations Page
import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "../dashboard/DashboardLayout";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { EmptyState } from "../../components/ui/EmptyState";
import { AutomationFormModal } from "./AutomationFormModal";
import { Zap, Plus, Pencil, Trash2, Loader2, AlertCircle, ToggleLeft, ToggleRight } from "lucide-react";

interface Automation {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  trigger: string;
  triggerConfig: unknown;
  conditions: unknown[];
  action: string;
  actionConfig: Record<string, unknown>;
  isActive: boolean;
  delayMinutes: number;
  lastTriggeredAt: string | null;
  runCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// Matches backend TRIGGER_TYPES / ACTION_TYPES from automations service
const TRIGGER_LABELS: Record<string, string> = {
  lead_created: "Lead Created",
  lead_stage_changed: "Lead Stage Changed",
  quote_accepted: "Quote Accepted",
  appointment_booked: "Appointment Booked",
  job_completed: "Job Completed",
  invoice_paid: "Invoice Paid",
};

const ACTION_LABELS: Record<string, string> = {
  send_message: "Send Message",
  create_task: "Create Task",
  update_lead_stage: "Update Lead Stage",
  notify_owner: "Notify Owner",
  schedule_follow_up: "Schedule Follow-up",
};

function triggerLabel(trigger: string): string {
  return TRIGGER_LABELS[trigger] ?? trigger;
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function AutomationsPage() {
  const { user } = useAuth();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Automation | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const orgId = user?.orgId ?? "";

  const fetchAutomations = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.get<{ data: Automation[] }>(
        `/api/v1/orgs/${orgId}/automations`,
      );

      if (res.error) {
        setError(res.error.message);
      } else {
        setAutomations(res.data?.data ?? []);
      }
    } catch {
      setError("Failed to load automations");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchAutomations();
  }, [fetchAutomations]);

  async function handleToggle(auto: Automation) {
    setToggling(auto.id);
    try {
      const res = await api.post<{ data: Automation }>(
        `/api/v1/orgs/${orgId}/automations/${auto.id}/toggle`,
      );
      if (res.data?.data) {
        setAutomations((prev) =>
          prev.map((a) => (a.id === auto.id ? res.data!.data! : a)),
        );
      }
    } catch {
      // ignore
    } finally {
      setToggling(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this automation?")) return;
    setDeleting(id);
    try {
      const res = await api.delete(`/api/v1/orgs/${orgId}/automations/${id}`);
      if (!res.error) {
        setAutomations((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  }

  function handleEdit(auto: Automation) {
    setEditing(auto);
    setModalOpen(true);
  }

  function handleNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function handleSaved(updated: Automation) {
    if (editing) {
      setAutomations((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a)),
      );
    } else {
      setAutomations((prev) => [updated, ...prev]);
    }
    setModalOpen(false);
    setEditing(null);
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Set up triggers and actions to automate your workflows
          </p>
        </div>
        <button
          onClick={handleNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Automation
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Error loading automations</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <button
            onClick={fetchAutomations}
            className="ml-auto text-sm text-red-700 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && automations.length === 0 && (
        <EmptyState
          icon={<Zap className="w-12 h-12" />}
          title="No automations yet"
          description="Create automations to send messages, create tasks, update lead stages, and more — triggered by key events in your pipeline."
          action={{ label: "New Automation", onClick: handleNew }}
        />
      )}

      {/* Card grid */}
      {!loading && automations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {automations.map((auto) => (
            <div
              key={auto.id}
              className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow ${
                auto.isActive ? "border-gray-200" : "border-gray-100 opacity-70"
              }`}
            >
              <div className="p-5">
                {/* Top row: name + active toggle */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900 pr-2 line-clamp-1">
                    {auto.name}
                  </h3>
                  <button
                    onClick={() => handleToggle(auto)}
                    disabled={toggling === auto.id}
                    className="shrink-0 text-gray-400 hover:text-blue-600 transition disabled:opacity-50"
                    title={auto.isActive ? "Deactivate" : "Activate"}
                  >
                    {toggling === auto.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : auto.isActive ? (
                      <ToggleRight className="w-5 h-5 text-blue-600" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Trigger → Action */}
                <div className="flex items-center gap-2 mb-3 text-sm">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-medium">
                    <Zap className="w-3 h-3" />
                    {triggerLabel(auto.trigger)}
                  </span>
                  <span className="text-gray-300">→</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-50 text-green-700 text-xs font-medium">
                    {actionLabel(auto.action)}
                  </span>
                </div>

                {/* Description */}
                {auto.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                    {auto.description}
                  </p>
                )}

                {/* Meta info */}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>
                    {auto.runCount > 0
                      ? `${auto.runCount} run${auto.runCount !== 1 ? "s" : ""}`
                      : "Never run"}
                  </span>
                  <span>
                    {auto.lastTriggeredAt
                      ? `Last: ${formatRelative(auto.lastTriggeredAt)}`
                      : ""}
                  </span>
                </div>
              </div>

              {/* Bottom actions */}
              <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-3">
                <button
                  onClick={() => handleEdit(auto)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-blue-600 transition"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(auto.id)}
                  disabled={deleting === auto.id}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-red-600 transition disabled:opacity-50"
                >
                  {deleting === auto.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      <AutomationFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        automation={editing}
        orgId={orgId}
        onSaved={handleSaved}
      />
    </DashboardLayout>
  );
}
