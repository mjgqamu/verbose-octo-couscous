import type { LeadStage } from "@sitepilot/shared";

const stageConfig: Record<LeadStage, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-50 text-blue-700 border-blue-200" },
  contacted: { label: "Contacted", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  qualified: { label: "Qualified", color: "bg-purple-50 text-purple-700 border-purple-200" },
  quote_sent: { label: "Quote Sent", color: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Approved", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  job_scheduled: { label: "Job Scheduled", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  completed: { label: "Completed", color: "bg-green-50 text-green-700 border-green-200" },
  lost: { label: "Lost", color: "bg-red-50 text-red-700 border-red-200" },
};

const sourceConfig: Record<string, { label: string; color: string }> = {
  phone_call: { label: "Phone Call", color: "bg-sky-50 text-sky-700 border-sky-200" },
  website_chat: { label: "Web Chat", color: "bg-violet-50 text-violet-700 border-violet-200" },
  website_form: { label: "Web Form", color: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200" },
  whatsapp: { label: "WhatsApp", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  email: { label: "Email", color: "bg-amber-50 text-amber-700 border-amber-200" },
  facebook: { label: "Facebook", color: "bg-blue-50 text-blue-700 border-blue-200" },
  google_business: { label: "Google", color: "bg-red-50 text-red-700 border-red-200" },
  referral: { label: "Referral", color: "bg-teal-50 text-teal-700 border-teal-200" },
  repeat_customer: { label: "Repeat", color: "bg-green-50 text-green-700 border-green-200" },
  walk_in: { label: "Walk-in", color: "bg-orange-50 text-orange-700 border-orange-200" },
  other: { label: "Other", color: "bg-gray-50 text-gray-700 border-gray-200" },
};

interface StageBadgeProps {
  stage: string;
  size?: "sm" | "md";
}

export function StageBadge({ stage, size = "md" }: StageBadgeProps) {
  const config = stageConfig[stage as LeadStage] ?? { label: stage, color: "bg-gray-50 text-gray-700 border-gray-200" };
  const sizing = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${sizing} ${config.color}`}>
      {config.label}
    </span>
  );
}

interface SourceBadgeProps {
  source: string;
}

export function SourceBadge({ source }: SourceBadgeProps) {
  const config = sourceConfig[source] ?? { label: source, color: "bg-gray-50 text-gray-700 border-gray-200" };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${config.color}`}>
      {config.label}
    </span>
  );
}

// Priority badge
export function PriorityBadge({ priority }: { priority: number }) {
  if (priority >= 2) {
    return <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-red-50 text-red-700 border-red-200">High</span>;
  }
  if (priority === 1) {
    return <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-amber-50 text-amber-700 border-amber-200">Medium</span>;
  }
  return null;
}
// ScoreBadge moved to its own file: ./ScoreBadge.tsx
