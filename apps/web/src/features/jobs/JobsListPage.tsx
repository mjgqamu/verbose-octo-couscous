import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { DashboardLayout } from "../dashboard/DashboardLayout";
import { JobStatusBadge } from "../../components/ui/JobStatusBadge";
import { DataTable } from "../../components/ui/DataTable";
import type { Column } from "../../components/ui/DataTable";
import { SearchInput } from "../../components/ui/SearchInput";
import { JobCreateModal } from "./JobCreateModal";
import { EmptyState } from "../../components/ui/EmptyState";
import { Plus, Wrench } from "lucide-react";

interface JobRow {
  id: string;
  number: string;
  title: string;
  status: string;
  priority: number;
  serviceType?: string | null;
  scheduledStart?: string | null;
  assignedTechs?: string[] | null;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    company: string | null;
  } | null;
  createdAt: string;
}

const JOB_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "new", label: "New" },
  { value: "scheduled", label: "Scheduled" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting", label: "Waiting" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function formatScheduled(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function JobsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, hasMore: false, cursor: null as string | null });
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchJobs = useCallback(async (cursor?: string | null) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);
    if (cursor) params.set("cursor", cursor);
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    params.set("limit", "20");

    const res = await api.get<{ data: JobRow[]; pagination: { total: number; hasMore: boolean; cursor: string | null } }>(
      `/api/v1/orgs/${user!.orgId}/jobs?${params.toString()}`
    );

    if (res.data) {
      setJobs(res.data.data);
      setPagination(res.data.pagination);
    }
    setLoading(false);
  }, [user, statusFilter, search, sortBy, sortDir]);

  useEffect(() => {
    fetchJobs(null);
  }, [fetchJobs]);

  const handleJobCreated = () => {
    setShowCreate(false);
    fetchJobs(null);
  };

  const columns: Column<JobRow>[] = [
    {
      key: "number",
      header: "Job #",
      sortable: false,
      render: (row) => (
        <span className="font-mono text-sm font-medium text-gray-900">{row.number}</span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      sortable: false,
      render: (row) => (
        <span className="text-sm text-gray-700">
          {row.customer
            ? `${row.customer.firstName} ${row.customer.lastName}`
            : "—"}
        </span>
      ),
    },
    {
      key: "title",
      header: "Service",
      sortable: false,
      render: (row) => (
        <div>
          <span className="text-sm text-gray-900">{row.title}</span>
          {row.serviceType && (
            <span className="block text-xs text-gray-400">{row.serviceType}</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <JobStatusBadge status={row.status} size="sm" />,
    },
    {
      key: "scheduledStart",
      header: "Scheduled",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-600">{formatScheduled(row.scheduledStart)}</span>
      ),
    },
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-sm text-gray-500 mt-1">
            {pagination.total} job{pagination.total !== 1 ? "s" : ""} total
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create Job
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 max-w-sm">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search jobs..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          {JOB_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {!loading && jobs.length === 0 ? (
        <EmptyState
          icon={<Wrench className="w-12 h-12" />}
          title="No jobs found"
          description={statusFilter || search ? "Try adjusting your filters." : "Create your first job to get started."}
          action={
            !statusFilter && !search
              ? { label: "Create Job", onClick: () => setShowCreate(true) }
              : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={jobs}
          keyField="id"
          loading={loading}
          onRowClick={(row) => navigate(`/dashboard/jobs/${row.id}`)}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={(key) => {
            if (sortBy === key) {
              setSortDir((d) => (d === "asc" ? "desc" : "asc"));
            } else {
              setSortBy(key);
              setSortDir("desc");
            }
          }}
        />
      )}

      {/* Load more */}
      {pagination.hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={() => fetchJobs(pagination.cursor)}
            className="px-6 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
          >
            Load more
          </button>
        </div>
      )}

      {/* Create modal */}
      <JobCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleJobCreated}
      />
    </DashboardLayout>
  );
}
