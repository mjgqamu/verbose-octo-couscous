// SitePilot AI — Follow-ups Page
import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "../dashboard/DashboardLayout";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { Bell, Clock, AlertCircle, CheckCircle, XCircle, Loader2, Zap } from "lucide-react";

interface FollowUpRun {
  id: string;
  status: string;
  entityType: string;
  entityId: string;
  result: {
    followUpType?: string;
    messageContent?: string;
    delivered?: boolean;
    scheduledFor?: string;
  } | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Running", value: "running" },
  { label: "Completed", value: "completed" },
  { label: "Failed", value: "failed" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function entityLabel(entityType: string): string {
  switch (entityType) {
    case "quote": return "Quote";
    case "appointment": return "Appointment";
    case "lead": return "Lead";
    case "job": return "Job";
    default: return entityType;
  }
}

function followUpLabel(followUpType: string | undefined): string {
  if (!followUpType) return "Follow-up";
  switch (followUpType) {
    case "quote_follow_up_2d": return "Quote follow-up (2 days)";
    case "quote_follow_up_5d": return "Quote follow-up (5 days)";
    case "quote_follow_up_10d": return "Quote follow-up (10 days)";
    case "appointment_reminder_24h": return "Appointment reminder (24h)";
    case "appointment_reminder_1h": return "Appointment reminder (1h)";
    case "inactive_lead_recovery_14d": return "Inactive lead recovery (14 days)";
    case "review_request_3d": return "Review request (3 days)";
    default: return followUpType.replace(/_/g, " ");
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3" /> Pending
        </span>
      );
    case "running":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Loader2 className="w-3 h-3 animate-spin" /> Running
        </span>
      );
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3" /> Completed
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3" /> Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {status}
        </span>
      );
  }
}

export function FollowUpsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<FollowUpRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [triggering, setTriggering] = useState<string | null>(null);

  const orgId = user?.orgId ?? "";

  const fetchFollowUps = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "50");

      const res = await api.get<{ data: FollowUpRun[]; pagination: { total: number } }>(
        `/api/v1/orgs/${orgId}/follow-ups?${params.toString()}`,
      );

      if (res.error) {
        setError(res.error.message);
      } else {
        setData(res.data?.data ?? []);
      }
    } catch (err) {
      setError("Failed to load follow-ups");
    } finally {
      setLoading(false);
    }
  }, [orgId, statusFilter]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchFollowUps, 30000);
    return () => clearInterval(interval);
  }, [fetchFollowUps]);

  async function handleTrigger(entityType: string, entityId: string) {
    if (!orgId) return;
    setTriggering(`${entityType}:${entityId}`);

    try {
      const res = await api.post(`/api/v1/orgs/${orgId}/follow-ups/trigger`, {
        entityType,
        entityId,
      });

      if (res.error) {
        alert(`Failed to trigger: ${res.error.message}`);
      } else {
        fetchFollowUps();
      }
    } catch {
      alert("Failed to trigger follow-up");
    } finally {
      setTriggering(null);
    }
  }

  const columns: Column<FollowUpRun>[] = [
    {
      key: "type",
      header: "Type",
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900 text-sm">
            {followUpLabel(row.result?.followUpType)}
          </p>
          <p className="text-xs text-gray-500">
            {entityLabel(row.entityType)} • {row.entityId.slice(0, 8)}…
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => statusBadge(row.status),
    },
    {
      key: "scheduled",
      header: "Scheduled",
      render: (row) => (
        <span className="text-sm text-gray-600">
          {row.result?.scheduledFor
            ? formatRelative(row.result.scheduledFor)
            : formatRelative(row.createdAt)}
        </span>
      ),
    },
    {
      key: "completed",
      header: "Completed",
      render: (row) => (
        <span className="text-sm text-gray-600">{formatDate(row.completedAt)}</span>
      ),
    },
    {
      key: "message",
      header: "Message",
      render: (row) => (
        <span className="text-sm text-gray-500 max-w-[200px] truncate block">
          {row.result?.messageContent ?? row.errorMessage ?? "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleTrigger(row.entityType, row.entityId);
          }}
          disabled={triggering === `${row.entityType}:${row.entityId}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition disabled:opacity-50"
        >
          {triggering === `${row.entityType}:${row.entityId}` ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Zap className="w-3 h-3" />
          )}
          Trigger Now
        </button>
      ),
    },
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Follow-ups</h1>
          <p className="text-sm text-gray-500 mt-1">
            Automated follow-ups, reminders, and recovery messages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchFollowUps}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="mb-4 flex gap-1.5 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
              statusFilter === f.value
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Error loading follow-ups</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <button
            onClick={fetchFollowUps}
            className="ml-auto text-sm text-red-700 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={data}
        keyField="id"
        loading={loading}
        emptyState={
          <EmptyState
            icon={<Bell className="w-12 h-12" />}
            title="No follow-ups yet"
            description="Follow-ups will appear here when quotes are created, appointments are booked, or jobs are completed."
          />
        }
      />

      {/* Summary stats */}
      {data.length > 0 && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Pending",
              count: data.filter((r) => r.status === "pending").length,
              color: "bg-yellow-50 text-yellow-700 border-yellow-200",
            },
            {
              label: "Running",
              count: data.filter((r) => r.status === "running").length,
              color: "bg-blue-50 text-blue-700 border-blue-200",
            },
            {
              label: "Completed",
              count: data.filter((r) => r.status === "completed").length,
              color: "bg-green-50 text-green-700 border-green-200",
            },
            {
              label: "Failed",
              count: data.filter((r) => r.status === "failed").length,
              color: "bg-red-50 text-red-700 border-red-200",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-xl border p-4 ${stat.color}`}
            >
              <p className="text-2xl font-bold">{stat.count}</p>
              <p className="text-sm font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
