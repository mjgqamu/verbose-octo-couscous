const statusConfig: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-gray-50 text-gray-700 border-gray-200" },
  scheduled: { label: "Scheduled", color: "bg-blue-50 text-blue-700 border-blue-200" },
  assigned: { label: "Assigned", color: "bg-purple-50 text-purple-700 border-purple-200" },
  in_progress: { label: "In Progress", color: "bg-orange-50 text-orange-700 border-orange-200" },
  waiting_on_parts: { label: "Waiting (Parts)", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  waiting_on_customer: { label: "Waiting (Customer)", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  waiting: { label: "Waiting", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  completed: { label: "Completed", color: "bg-green-50 text-green-700 border-green-200" },
  cancelled: { label: "Cancelled", color: "bg-red-50 text-red-700 border-red-200" },
};

interface JobStatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export function JobStatusBadge({ status, size = "md" }: JobStatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status.replace(/_/g, " "), color: "bg-gray-50 text-gray-700 border-gray-200" };
  const sizing = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${sizing} ${config.color}`}>
      {config.label}
    </span>
  );
}

export { statusConfig as jobStatusConfig };
