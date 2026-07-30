// SitePilot AI — Automation Form Modal (Create / Edit)
import { useState, useEffect } from "react";
import { SlideOver } from "../../components/ui/SlideOver";
import { api } from "../../lib/api";
import { Loader2 } from "lucide-react";

// Matches backend TRIGGER_TYPES / ACTION_TYPES from automations service
const TRIGGER_OPTIONS = [
  { value: "lead_created", label: "Lead Created" },
  { value: "lead_stage_changed", label: "Lead Stage Changed" },
  { value: "quote_accepted", label: "Quote Accepted" },
  { value: "appointment_booked", label: "Appointment Booked" },
  { value: "job_completed", label: "Job Completed" },
  { value: "invoice_paid", label: "Invoice Paid" },
];

const ACTION_OPTIONS = [
  { value: "send_message", label: "Send Message" },
  { value: "create_task", label: "Create Task" },
  { value: "update_lead_stage", label: "Update Lead Stage" },
  { value: "notify_owner", label: "Notify Owner" },
  { value: "schedule_follow_up", label: "Schedule Follow-up" },
];

// Matches shared LEAD_STAGES constant
const LEAD_STAGE_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "quote_sent", label: "Quote Sent" },
  { value: "approved", label: "Approved" },
  { value: "job_scheduled", label: "Job Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "lost", label: "Lost" },
];

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

interface Props {
  open: boolean;
  onClose: () => void;
  automation: Automation | null;
  orgId: string;
  onSaved: (automation: Automation) => void;
}

export function AutomationFormModal({ open, onClose, automation, orgId, onSaved }: Props) {
  const isEdit = !!automation;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("lead_created");
  const [action, setAction] = useState("send_message");
  const [isActive, setIsActive] = useState(true);

  // Conditional fields by action type
  const [messageTemplate, setMessageTemplate] = useState(
    "Hello {customerName}, this is {businessName}. We noticed your recent activity and wanted to follow up.",
  );
  const [targetStage, setTargetStage] = useState("new");
  const [taskDescription, setTaskDescription] = useState("Follow up with {customerName}");

  // Populate form when editing
  useEffect(() => {
    if (open) {
      if (automation) {
        setName(automation.name);
        setDescription(automation.description ?? "");
        setTrigger(automation.trigger);
        setAction(automation.action);
        setIsActive(automation.isActive);

        const cfg = automation.actionConfig as Record<string, unknown>;
        setMessageTemplate((cfg.messageTemplate as string) ?? "Hello {customerName}, this is {businessName}.");
        setTargetStage((cfg.targetStage as string) ?? "new");
        setTaskDescription((cfg.taskDescription as string) ?? "Follow up with {customerName}");
      } else {
        // Reset form
        setName("");
        setDescription("");
        setTrigger("lead_created");
        setAction("send_message");
        setIsActive(true);
        setMessageTemplate("Hello {customerName}, this is {businessName}. We noticed your recent activity and wanted to follow up.");
        setTargetStage("new");
        setTaskDescription("Follow up with {customerName}");
      }
      setError(null);
    }
  }, [open, automation]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError(null);

    // Build actionConfig based on action type
    let actionConfig: Record<string, unknown> = {};

    switch (action) {
      case "send_message":
        actionConfig = { messageTemplate };
        break;
      case "create_task":
        actionConfig = { taskDescription };
        break;
      case "update_lead_stage":
        actionConfig = { targetStage };
        break;
      default:
        actionConfig = {};
        break;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      trigger,
      action,
      actionConfig,
      isActive,
    };

    try {
      let res;

      if (isEdit && automation) {
        res = await api.patch<{ data: Automation }>(
          `/api/v1/orgs/${orgId}/automations/${automation.id}`,
          payload,
        );
      } else {
        res = await api.post<{ data: Automation }>(
          `/api/v1/orgs/${orgId}/automations`,
          payload,
        );
      }

      if (res.error) {
        setError(res.error.message);
      } else if (res.data?.data) {
        onSaved(res.data.data);
      }
    } catch {
      setError("Failed to save automation");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Automation" : "New Automation"}
      wide
    >
      <form onSubmit={handleSave} className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={255}
            placeholder="e.g., Notify owner on new lead"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            placeholder="Optional description of what this does"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Active toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Active</label>
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isActive ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isActive ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Trigger Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            When this happens…
          </label>
          <select
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            {TRIGGER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Action Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Then do this…
          </label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Conditional fields based on action */}
        {action === "send_message" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Template
            </label>
            <textarea
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
              placeholder="Type your message template..."
            />
            <p className="mt-1 text-xs text-gray-400">
              You can use {"{customerName}"} and {"{businessName}"} as placeholders.
            </p>
          </div>
        )}

        {action === "create_task" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Description
            </label>
            <textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
              placeholder="Describe the task to create..."
            />
            <p className="mt-1 text-xs text-gray-400">
              You can use {"{customerName}"} and {"{businessName}"} as placeholders.
            </p>
          </div>
        )}

        {action === "update_lead_stage" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Stage
            </label>
            <select
              value={targetStage}
              onChange={(e) => setTargetStage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              {LEAD_STAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {action === "notify_owner" && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              The business owner will receive an in-app notification when this trigger fires.
            </p>
          </div>
        )}

        {action === "schedule_follow_up" && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              A follow-up will be scheduled automatically when this trigger fires.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Automation"}
          </button>
        </div>
      </form>
    </SlideOver>
  );
}
