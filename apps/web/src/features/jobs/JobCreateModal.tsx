import { useState, useEffect } from "react";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { SlideOver } from "../../components/ui/SlideOver";

interface CustomerOption {
  id: string;
  firstName: string;
  lastName: string;
  company?: string | null;
}

interface LeadOption {
  id: string;
  contactName?: string | null;
  title?: string | null;
  serviceType?: string | null;
  customerId?: string | null;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface JobCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  prefillLeadId?: string;
  prefillCustomerId?: string;
}

export function JobCreateModal({ open, onClose, onCreated, prefillLeadId, prefillCustomerId }: JobCreateModalProps) {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [customerId, setCustomerId] = useState(prefillCustomerId || "");
  const [leadId, setLeadId] = useState(prefillLeadId || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [priority, setPriority] = useState(0);
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Load customers on mount
  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    Promise.all([
      api.get<{ data: CustomerOption[]; pagination: { total: number } }>(`/api/v1/orgs/${user.orgId}/customers?limit=100`),
      api.get<{ data: LeadOption[]; pagination: { total: number } }>(`/api/v1/orgs/${user.orgId}/leads?limit=100&stage=new&stage=qualified&stage=quote_sent`),
    ]).then(([custRes, leadRes]) => {
      if (custRes.data) setCustomers(custRes.data.data);
      if (leadRes.data) setLeads(leadRes.data.data);
      setLoading(false);
    });
  }, [open, user]);

  // Pre-fill from lead
  useEffect(() => {
    if (!leadId || leads.length === 0) return;
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      if (lead.customerId && !customerId) setCustomerId(lead.customerId);
      if (!title && lead.title) setTitle(lead.title);
      if (!serviceType && lead.serviceType) setServiceType(lead.serviceType);
    }
  }, [leadId, leads]);

  // Pre-fill from customer's address — reserved for customer detail API
  // (currently we only load customer names, not full addresses)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !title.trim()) return;

    setSubmitting(true);
    const res = await api.post(`/api/v1/orgs/${user!.orgId}/jobs`, {
      customerId,
      leadId: leadId || undefined,
      title: title.trim(),
      description: description.trim() || undefined,
      serviceType: serviceType.trim() || undefined,
      priority,
      scheduledStart: scheduledStart || undefined,
      scheduledEnd: scheduledEnd || undefined,
      addressLine1: addressLine1.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      postalCode: postalCode.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    if (res.data) {
      onCreated();
      resetForm();
    } else if (res.error) {
      alert(res.error.message);
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setCustomerId("");
    setLeadId("");
    setTitle("");
    setDescription("");
    setServiceType("");
    setPriority(0);
    setScheduledStart("");
    setScheduledEnd("");
    setNotes("");
    setAddressLine1("");
    setCity("");
    setState("");
    setPostalCode("");
  };

  return (
    <SlideOver open={open} onClose={onClose} title="Create Job" wide>
      {loading ? (
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Customer selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Customer <span className="text-red-500">*</span>
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="">Select a customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}{c.company ? ` (${c.company})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Lead (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Source Lead <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="">No lead...</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.contactName || l.title || "Lead"} {l.customer ? `— ${l.customer.firstName} ${l.customer.lastName}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Job title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={500}
              placeholder="e.g. Water heater replacement"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Service type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Service Type
            </label>
            <input
              type="text"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              placeholder="e.g. Plumbing, HVAC, Electrical"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Job details..."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Scheduled Start
              </label>
              <input
                type="datetime-local"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Scheduled End
              </label>
              <input
                type="datetime-local"
                value={scheduledEnd}
                onChange={(e) => setScheduledEnd(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Priority
            </label>
            <div className="flex gap-2">
              {[
                { value: 0, label: "Normal", color: "bg-gray-100 text-gray-700 border-gray-200" },
                { value: 1, label: "Medium", color: "bg-amber-50 text-amber-700 border-amber-200" },
                { value: 2, label: "High", color: "bg-red-50 text-red-700 border-red-200" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition ${
                    priority === opt.value
                      ? `${opt.color} ring-2 ring-offset-1 ring-blue-500`
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Address */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-900 mb-3">Job Location</p>
            <div className="space-y-3">
              <input
                type="text"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="Address line 1"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="ZIP"
                  className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Internal notes..."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => { onClose(); resetForm(); }}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!customerId || !title.trim() || submitting}
              className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
            >
              {submitting ? "Creating..." : "Create Job"}
            </button>
          </div>
        </form>
      )}
    </SlideOver>
  );
}
