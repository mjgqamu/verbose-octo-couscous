// SitePilot AI — Appointment Create/Edit Modal
import { useState } from "react";
import { api } from "../../lib/api";
import { X, Loader2 } from "lucide-react";

interface TimeSlot {
  date: string;
  time: string;
  slot: string;
}

interface AppointmentModalProps {
  orgId: string;
  timeSlots: TimeSlot[];
  appointment?: {
    id: string;
    title: string;
    description?: string | null;
    scheduledStart: string;
    customer?: {
      id: string;
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
    } | null;
    notes?: string | null;
  } | null;
  onClose: () => void;
  onCreated: () => void;
}

export function AppointmentModal({
  orgId,
  timeSlots,
  appointment: existing,
  onClose,
  onCreated,
}: AppointmentModalProps) {
  const isEditing = !!existing;

  const [customerName, setCustomerName] = useState(
    existing?.customer
      ? `${existing.customer.firstName} ${existing.customer.lastName}`
      : "",
  );
  const [customerPhone, setCustomerPhone] = useState(existing?.customer?.phone ?? "");
  const [customerEmail, setCustomerEmail] = useState(existing?.customer?.email ?? "");
  const [serviceType, setServiceType] = useState("General service");
  const [selectedDate, setSelectedDate] = useState(
    existing
      ? new Date(existing.scheduledStart).toISOString().split("T")[0]
      : timeSlots[0]?.date ?? "",
  );
  const [selectedTime, setSelectedTime] = useState(
    existing
      ? new Date(existing.scheduledStart).toTimeString().slice(0, 5)
      : timeSlots[0]?.time ?? "",
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group slots by date
  const slotsByDate: Record<string, TimeSlot[]> = {};
  for (const slot of timeSlots) {
    if (!slotsByDate[slot.date]) slotsByDate[slot.date] = [];
    slotsByDate[slot.date]!.push(slot);
  }

  const availableDates = Object.keys(slotsByDate).sort();
  const availableTimes = (selectedDate ? slotsByDate[selectedDate] : undefined)?.map((s: TimeSlot) => ({
    time: s.time,
    slot: s.slot,
  })) ?? [];

  const handleSave = async () => {
    if (!customerName.trim()) {
      setError("Customer name is required.");
      return;
    }
    if (!serviceType.trim()) {
      setError("Service type is required.");
      return;
    }
    if (!selectedDate || !selectedTime) {
      setError("Please select a date and time.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEditing && existing) {
        const res = await api.patch(
          `/api/v1/orgs/${orgId}/appointments/${existing.id}`,
          {
            date: selectedDate,
            time: selectedTime,
            notes: notes || undefined,
          },
        );
        if (res.error) {
          setError(res.error.message);
          return;
        }
      } else {
        const res = await api.post(`/api/v1/orgs/${orgId}/appointments`, {
          customerName: customerName.trim(),
          customerPhone: customerPhone || undefined,
          customerEmail: customerEmail || undefined,
          serviceType: serviceType.trim(),
          date: selectedDate,
          time: selectedTime,
          notes: notes || undefined,
        });
        if (res.error) {
          setError(res.error.message);
          return;
        }
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save appointment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-md bg-white h-full shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? "Edit Appointment" : "New Appointment"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Customer Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="John Smith"
              disabled={isEditing}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="+1 (555) 000-0000"
                disabled={isEditing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="john@example.com"
                disabled={isEditing}
              />
            </div>
          </div>

          {/* Service Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Type *
            </label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option>General service</option>
              <option>Plumbing</option>
              <option>Electrical</option>
              <option>HVAC</option>
              <option>Roofing</option>
              <option>Landscaping</option>
              <option>Cleaning</option>
              <option>Renovation</option>
              <option>Solar Installation</option>
              <option>Pest Control</option>
              <option>Appliance Repair</option>
              <option>Inspection</option>
            </select>
          </div>

          {/* Date picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date *
            </label>
            <select
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedTime("");
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              {availableDates.length === 0 && (
                <option value="">No available dates</option>
              )}
              {availableDates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
          </div>

          {/* Time picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableTimes.map((t: { time: string; slot: string }) => (
                <button
                  key={t.time}
                  type="button"
                  onClick={() => setSelectedTime(t.time)}
                  className={`px-3 py-2 text-sm rounded-lg border transition ${
                    selectedTime === t.time
                      ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {t.time}
                </button>
              ))}
              {availableTimes.length === 0 && selectedDate && (
                <p className="text-sm text-gray-400 col-span-2">No available slots for this date.</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              rows={3}
              placeholder="Any special instructions..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEditing ? "Update" : "Book Appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}
