import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { DashboardLayout } from "../dashboard/DashboardLayout";
import { RequireRole } from "../../lib/ProtectedRoute";
import {
  DataTable,
  SearchInput,
  SlideOver,
  PipelineBoard,
  EmptyState,
  StageBadge,
  SourceBadge,
  PriorityBadge,
  ScoreBadge,
} from "../../components/ui";
import type { Column } from "../../components/ui";
import {
  Plus,
  LayoutList,
  Columns3,
  X,
} from "lucide-react";

interface Lead {
  id: string;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  company?: string | null;
  source: string;
  stage: string;
  priority?: number | null;
  title?: string | null;
  estimatedValue?: string | null;
  createdAt: string;
  aiScore?: number | null;
  customer?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
  } | null;
}

export function LeadsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ cursor: null as string | null, hasMore: false, total: 0 });
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [slideOverOpen, setSlideOverOpen] = useState(false);

  // New lead form
  const [newLead, setNewLead] = useState({
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    title: "",
    description: "",
    source: "phone_call",
    serviceType: "",
    estimatedValue: "",
    priority: 0,
  });
  const [creating, setCreating] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "50");
    if (search) params.set("search", search);
    if (stageFilter) params.set("stage", stageFilter);
    if (sourceFilter) params.set("source", sourceFilter);
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);

    const res = await api.get<{ data: Lead[]; pagination: { cursor: string | null; hasMore: boolean; total: number } }>(
      `/api/v1/orgs/${user!.orgId}/leads?${params.toString()}`
    );
    if (res.data) {
      setLeads(res.data.data);
      setPagination(res.data.pagination);
    }
    setLoading(false);
  }, [user, search, stageFilter, sourceFilter, sortBy, sortDir]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleCreateLead = async () => {
    if (!newLead.contactName && !newLead.contactPhone && !newLead.contactEmail) return;
    setCreating(true);
    const res = await api.post<{ data: Lead }>(`/api/v1/orgs/${user!.orgId}/leads`, {
      contactName: newLead.contactName || undefined,
      contactPhone: newLead.contactPhone || undefined,
      contactEmail: newLead.contactEmail || undefined,
      title: newLead.title || undefined,
      description: newLead.description || undefined,
      source: newLead.source,
      serviceType: newLead.serviceType || undefined,
      estimatedValue: newLead.estimatedValue || undefined,
      priority: newLead.priority,
    });
    setCreating(false);
    if (res.data) {
      setSlideOverOpen(false);
      setNewLead({ contactName: "", contactPhone: "", contactEmail: "", title: "", description: "", source: "phone_call", serviceType: "", estimatedValue: "", priority: 0 });
      fetchLeads();
    }
  };

  const handleMoveLead = async (leadId: string, newStage: string) => {
    await api.patch(`/api/v1/orgs/${user!.orgId}/leads/${leadId}`, { stage: newStage });
    fetchLeads();
  };

  const columns: Column<Lead>[] = [
    {
      key: "contactName",
      header: "Name",
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900 truncate max-w-[180px]">
            {row.contactName || (row.customer ? `${row.customer.firstName ?? ""} ${row.customer.lastName ?? ""}`.trim() : "—")}
          </p>
          {row.company && <p className="text-xs text-gray-500 truncate max-w-[180px]">{row.company}</p>}
        </div>
      ),
    },
    { key: "contactPhone", header: "Phone", render: (row) => row.contactPhone ? <span className="text-sm text-gray-600">{row.contactPhone}</span> : <span className="text-sm text-gray-400">—</span> },
    { key: "contactEmail", header: "Email", render: (row) => row.contactEmail ? <span className="text-sm text-gray-600 truncate max-w-[160px] block">{row.contactEmail}</span> : <span className="text-sm text-gray-400">—</span> },
    { key: "source", header: "Source", render: (row) => <SourceBadge source={row.source} /> },
    { key: "stage", header: "Stage", render: (row) => <StageBadge stage={row.stage} /> },
    {
      key: "aiScore",
      header: "Score",
      sortable: true,
      render: (row) =>
        row.aiScore != null ? (
          <ScoreBadge score={row.aiScore} size="sm" />
        ) : (
          <span className="text-sm text-gray-400">—</span>
        ),
    },
    {
      key: "estimatedValue",
      header: "Value",
      sortable: true,
      render: (row) => row.estimatedValue
        ? <span className="text-sm font-medium text-gray-900">{parseFloat(row.estimatedValue).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 })}</span>
        : <span className="text-sm text-gray-400">—</span>,
    },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      render: (row) => <PriorityBadge priority={row.priority ?? 0} />,
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      render: (row) => <span className="text-sm text-gray-500">{new Date(row.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>,
    },
  ];

  return (
    <DashboardLayout>
      <RequireRole roles={["business_owner", "office_admin"]}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
            <p className="text-sm text-gray-500 mt-1">{pagination.total} total leads</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition ${viewMode === "list" ? "bg-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                title="List view"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={`p-1.5 rounded-md transition ${viewMode === "kanban" ? "bg-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                title="Kanban view"
              >
                <Columns3 className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setSlideOverOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> New Lead
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 max-w-md">
            <SearchInput
              placeholder="Search leads by name, phone, email..."
              value={search}
              onChange={setSearch}
            />
          </div>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="">All Stages</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="quote_sent">Quote Sent</option>
            <option value="approved">Approved</option>
            <option value="job_scheduled">Job Scheduled</option>
            <option value="completed">Completed</option>
            <option value="lost">Lost</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="">All Sources</option>
            <option value="phone_call">Phone Call</option>
            <option value="website_form">Web Form</option>
            <option value="website_chat">Web Chat</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="referral">Referral</option>
            <option value="repeat_customer">Repeat Customer</option>
          </select>
          {(search || stageFilter || sourceFilter) && (
            <button
              onClick={() => { setSearch(""); setStageFilter(""); setSourceFilter(""); }}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Content */}
        {viewMode === "list" ? (
          <DataTable
            columns={columns}
            data={leads}
            keyField="id"
            onRowClick={(row) => navigate(`/dashboard/leads/${row.id}`)}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={(key) => {
              if (sortBy === key) {
                setSortDir(sortDir === "asc" ? "desc" : "asc");
              } else {
                setSortBy(key);
                setSortDir("desc");
              }
            }}
            loading={loading}
            emptyState={
              <EmptyState
                title="No leads yet"
                description="Leads from calls, chats, and forms will appear here. Create your first lead to get started."
                action={{ label: "New Lead", onClick: () => setSlideOverOpen(true) }}
              />
            }
          />
        ) : (
          <PipelineBoard
            leads={leads.map((l) => ({
              id: l.id,
              title: l.title,
              contactName: l.contactName,
              contactPhone: l.contactPhone,
              contactEmail: l.contactEmail,
              stage: l.stage,
              priority: l.priority,
              estimatedValue: l.estimatedValue,
              source: l.source,
            }))}
            onCardClick={(lead) => navigate(`/dashboard/leads/${lead.id}`)}
            onMoveLead={handleMoveLead}
          />
        )}

        {/* New Lead SlideOver */}
        <SlideOver open={slideOverOpen} onClose={() => setSlideOverOpen(false)} title="New Lead">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
              <input
                type="text"
                value={newLead.contactName}
                onChange={(e) => setNewLead({ ...newLead, contactName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="John Smith"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newLead.contactPhone}
                  onChange={(e) => setNewLead({ ...newLead, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newLead.contactEmail}
                  onChange={(e) => setNewLead({ ...newLead, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="john@email.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title / Job Description</label>
              <input
                type="text"
                value={newLead.title}
                onChange={(e) => setNewLead({ ...newLead, title: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., Water heater repair"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
              <input
                type="text"
                value={newLead.serviceType}
                onChange={(e) => setNewLead({ ...newLead, serviceType: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., plumbing, hvac, electrical"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select
                  value={newLead.source}
                  onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="phone_call">Phone Call</option>
                  <option value="website_form">Web Form</option>
                  <option value="website_chat">Web Chat</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="referral">Referral</option>
                  <option value="repeat_customer">Repeat Customer</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Est. Value ($)</label>
                <input
                  type="number"
                  value={newLead.estimatedValue}
                  onChange={(e) => setNewLead({ ...newLead, estimatedValue: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={newLead.priority}
                onChange={(e) => setNewLead({ ...newLead, priority: parseInt(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value={0}>Normal</option>
                <option value={1}>Medium</option>
                <option value={2}>High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={newLead.description}
                onChange={(e) => setNewLead({ ...newLead, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                placeholder="Any additional notes..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => setSlideOverOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateLead}
                disabled={creating}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Lead"}
              </button>
            </div>
          </div>
        </SlideOver>
      </RequireRole>
    </DashboardLayout>
  );
}
