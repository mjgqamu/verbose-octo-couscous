import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { DashboardLayout } from "../dashboard/DashboardLayout";
import { RequireRole } from "../../lib/ProtectedRoute";
import { DataTable, SearchInput, SlideOver, EmptyState } from "../../components/ui";
import type { Column } from "../../components/ui";
import { Plus, Phone, MapPin } from "lucide-react";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  lifetimeValue?: string | null;
  totalJobs?: number | null;
  lastJobAt?: string | null;
  createdAt: string;
}

export function CustomersListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ cursor: null as string | null, hasMore: false, total: 0 });
  const [search, setSearch] = useState("");
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    firstName: "",
    lastName: "",
    company: "",
    email: "",
    phone: "",
    addressLine1: "",
    city: "",
    state: "",
    postalCode: "",
  });
  const [creating, setCreating] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "50");
    if (search) params.set("search", search);

    const res = await api.get<{ data: Customer[]; pagination: { cursor: string | null; hasMore: boolean; total: number } }>(
      `/api/v1/orgs/${user!.orgId}/customers?${params.toString()}`
    );
    if (res.data) {
      setCustomers(res.data.data);
      setPagination(res.data.pagination);
    }
    setLoading(false);
  }, [user, search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleCreateCustomer = async () => {
    if (!newCustomer.firstName || !newCustomer.lastName) return;
    setCreating(true);
    const res = await api.post<{ data: Customer }>(`/api/v1/orgs/${user!.orgId}/customers`, {
      firstName: newCustomer.firstName,
      lastName: newCustomer.lastName,
      company: newCustomer.company || undefined,
      email: newCustomer.email || undefined,
      phone: newCustomer.phone || undefined,
      addressLine1: newCustomer.addressLine1 || undefined,
      city: newCustomer.city || undefined,
      state: newCustomer.state || undefined,
      postalCode: newCustomer.postalCode || undefined,
    });
    setCreating(false);
    if (res.data) {
      setSlideOverOpen(false);
      setNewCustomer({ firstName: "", lastName: "", company: "", email: "", phone: "", addressLine1: "", city: "", state: "", postalCode: "" });
      fetchCustomers();
    }
  };

  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.firstName} {row.lastName}</p>
          {row.company && <p className="text-xs text-gray-500">{row.company}</p>}
        </div>
      ),
    },
    { key: "phone", header: "Phone", render: (row) => row.phone ? <span className="text-sm text-gray-600 flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" />{row.phone}</span> : <span className="text-sm text-gray-400">—</span> },
    { key: "email", header: "Email", render: (row) => row.email ? <span className="text-sm text-gray-600">{row.email}</span> : <span className="text-sm text-gray-400">—</span> },
    {
      key: "location",
      header: "Location",
      render: (row) => (row.city || row.state) ? <span className="text-sm text-gray-600 flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-400" />{row.city}{row.state ? `, ${row.state}` : ""}</span> : <span className="text-sm text-gray-400">—</span>,
    },
    {
      key: "totalJobs",
      header: "Jobs",
      render: (row) => <span className="text-sm text-gray-700 font-medium">{row.totalJobs ?? 0}</span>,
    },
    {
      key: "lifetimeValue",
      header: "Revenue",
      render: (row) => row.lifetimeValue && parseFloat(row.lifetimeValue) > 0
        ? <span className="text-sm font-medium text-gray-900">{parseFloat(row.lifetimeValue).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 })}</span>
        : <span className="text-sm text-gray-400">—</span>,
    },
    {
      key: "createdAt",
      header: "Created",
      render: (row) => <span className="text-sm text-gray-500">{new Date(row.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>,
    },
  ];

  return (
    <DashboardLayout>
      <RequireRole roles={["business_owner", "office_admin"]}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-sm text-gray-500 mt-1">{pagination.total} total customers</p>
          </div>
          <button
            onClick={() => setSlideOverOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Customer
          </button>
        </div>

        {/* Search */}
        <div className="mb-4 max-w-md">
          <SearchInput
            placeholder="Search customers by name, email, phone..."
            value={search}
            onChange={setSearch}
          />
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={customers}
          keyField="id"
          onRowClick={(row) => navigate(`/dashboard/customers/${row.id}`)}
          loading={loading}
          emptyState={
            <EmptyState
              title="No customers yet"
              description="Customers will appear here when you create them or convert leads."
              action={{ label: "New Customer", onClick: () => setSlideOverOpen(true) }}
            />
          }
        />

        {/* New Customer SlideOver */}
        <SlideOver open={slideOverOpen} onClose={() => setSlideOverOpen(false)} title="New Customer">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input
                  type="text"
                  value={newCustomer.firstName}
                  onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  value={newCustomer.lastName}
                  onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Smith"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                value={newCustomer.company}
                onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Company name (optional)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="john@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={newCustomer.addressLine1}
                onChange={(e) => setNewCustomer({ ...newCustomer, addressLine1: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="123 Main St"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={newCustomer.city}
                  onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Austin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  value={newCustomer.state}
                  onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="TX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                <input
                  type="text"
                  value={newCustomer.postalCode}
                  onChange={(e) => setNewCustomer({ ...newCustomer, postalCode: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="78701"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => setSlideOverOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomer}
                disabled={creating || !newCustomer.firstName || !newCustomer.lastName}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Customer"}
              </button>
            </div>
          </div>
        </SlideOver>
      </RequireRole>
    </DashboardLayout>
  );
}
