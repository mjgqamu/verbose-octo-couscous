// SitePilot AI — Invoice Create Modal
import { useState, useEffect } from "react";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { X, Plus, Trash2, DollarSign } from "lucide-react";

interface CustomerOption {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
}

interface QuoteOption {
  id: string;
  number: string;
  title: string;
  customerId: string;
}

interface LineItemForm {
  key: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
}

interface InvoiceCreateModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function generateLineKey(): string {
  return `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

function calcLineTotal(item: LineItemForm): number {
  const qty = parseFloat(item.quantity) || 0;
  const price = parseFloat(item.unitPrice) || 0;
  return qty * price;
}

function calcSubtotal(items: LineItemForm[]): number {
  return items.reduce((sum, item) => sum + calcLineTotal(item), 0);
}

export function InvoiceCreateModal({ onClose, onCreated }: InvoiceCreateModalProps) {
  const { user } = useAuth();

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedQuote, setSelectedQuote] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [lineItems, setLineItems] = useState<LineItemForm[]>([
    { key: generateLineKey(), description: "", quantity: "1", unit: "ea", unitPrice: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Load customers on mount
  useEffect(() => {
    if (!user) return;
    api
      .get<{ data: CustomerOption[] }>(`/api/v1/orgs/${user.orgId}/customers?limit=100`)
      .then((res) => {
        if (res.data) setCustomers(res.data.data);
      })
      .catch(() => {});
  }, [user]);

  // Load quotes when customer selected
  useEffect(() => {
    if (!user || !selectedCustomer) return;
    api
      .get<{ data: QuoteOption[] }>(
        `/api/v1/orgs/${user.orgId}/customers/${selectedCustomer}/quotes?limit=50`,
      )
      .then((res) => {
        if (res.data) {
          // Filter to only accepted/sent quotes
          setQuotes(res.data.data);
        }
      })
      .catch(() => {});
  }, [user, selectedCustomer]);

  function addLineItem() {
    setLineItems([
      ...lineItems,
      { key: generateLineKey(), description: "", quantity: "1", unit: "ea", unitPrice: "" },
    ]);
  }

  function removeLineItem(key: string) {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((item) => item.key !== key));
  }

  function updateLineItem(key: string, field: keyof LineItemForm, value: string) {
    setLineItems(lineItems.map((item) => (item.key === key ? { ...item, [field]: value } : item)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setError("");
    setSubmitting(true);

    try {
      const taxRateNum = parseFloat(taxRate) / 100;
      const discountNum = parseFloat(discountAmount) || 0;

      // Validate line items
      const items = lineItems.map((item) => ({
        description: item.description.trim(),
        quantity: parseFloat(item.quantity),
        unit: item.unit || "ea",
        unitPrice: parseFloat(item.unitPrice),
        sortOrder: undefined as number | undefined,
      }));

      if (items.some((i) => !i.description || i.quantity <= 0 || isNaN(i.unitPrice))) {
        setError("Please fill in all line items with valid quantities and prices.");
        setSubmitting(false);
        return;
      }

      const res = await api.post(`/api/v1/orgs/${user.orgId}/invoices`, {
        customerId: selectedCustomer,
        quoteId: selectedQuote || undefined,
        lineItems: items,
        dueDate: new Date(dueDate).toISOString(),
        notes: notes || undefined,
        taxRate: taxRateNum,
        discountAmount: discountNum,
      });

      if (res.error) {
        setError(res.error.message);
      } else {
        onCreated();
      }
    } catch {
      setError("Failed to create invoice. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const subtotal = calcSubtotal(lineItems);
  const discount = parseFloat(discountAmount) || 0;
  const afterDiscount = subtotal - discount;
  const tax = parseFloat(taxRate) || 0;
  const taxAmount = Math.round(afterDiscount * (tax / 100) * 100) / 100;
  const total = afterDiscount + taxAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create Invoice</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Customer & Quote */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedCustomer}
                onChange={(e) => {
                  setSelectedCustomer(e.target.value);
                  setSelectedQuote("");
                }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Select a customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                    {c.company ? ` (${c.company})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link to Quote</label>
              <select
                value={selectedQuote}
                onChange={(e) => setSelectedQuote(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                disabled={!selectedCustomer}
              >
                <option value="">None</option>
                {quotes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.number} — {q.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Line Items <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addLineItem}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add item
              </button>
            </div>
            <div className="space-y-3">
              {lineItems.map((item, idx) => (
                <div key={item.key} className="flex items-start gap-2">
                  <span className="text-xs text-gray-400 mt-2.5 w-5 shrink-0">{idx + 1}.</span>
                  <div className="flex-1 grid grid-cols-12 gap-2">
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.key, "description", e.target.value)}
                      className="col-span-5 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.key, "quantity", e.target.value)}
                      className="col-span-2 px-2 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center"
                    />
                    <input
                      type="text"
                      placeholder="Unit"
                      value={item.unit}
                      onChange={(e) => updateLineItem(item.key, "unit", e.target.value)}
                      className="col-span-2 px-2 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Price"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(item.key, "unitPrice", e.target.value)}
                      className="col-span-2 px-2 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
                    />
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.key)}
                        className="col-span-1 p-2 text-gray-400 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-900">
                {subtotal.toLocaleString("en-US", { style: "currency", currency: "USD" })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Discount</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="w-24 px-2 py-1 text-sm text-right border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Tax (%)</span>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-24 px-2 py-1 text-sm text-right border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900">
                {total.toLocaleString("en-US", { style: "currency", currency: "USD" })}
              </span>
            </div>
          </div>

          {/* Due date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                placeholder="Payment instructions, thank you note..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedCustomer}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
            >
              {submitting ? "Creating..." : "Create Invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
