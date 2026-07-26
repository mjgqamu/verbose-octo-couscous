import { Phone, Mail, MessageSquare, FileText, Clock, User, CheckCircle, AlertCircle } from "lucide-react";

export interface Activity {
  id: string;
  activityType: string;
  description?: string | null;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

interface ActivityTimelineProps {
  activities: Activity[];
  emptyMessage?: string;
}

const activityConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  note: { icon: <FileText className="w-4 h-4" />, color: "bg-blue-100 text-blue-600" },
  call: { icon: <Phone className="w-4 h-4" />, color: "bg-green-100 text-green-600" },
  email: { icon: <Mail className="w-4 h-4" />, color: "bg-purple-100 text-purple-600" },
  meeting: { icon: <User className="w-4 h-4" />, color: "bg-amber-100 text-amber-600" },
  message: { icon: <MessageSquare className="w-4 h-4" />, color: "bg-indigo-100 text-indigo-600" },
  stage_change: { icon: <CheckCircle className="w-4 h-4" />, color: "bg-teal-100 text-teal-600" },
  system: { icon: <AlertCircle className="w-4 h-4" />, color: "bg-gray-100 text-gray-600" },
};

function getActivityConfig(type: string): { icon: React.ReactNode; color: string } {
  return (activityConfig[type] ?? activityConfig.note)!;
}

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ActivityTimeline({ activities, emptyMessage = "No activity yet" }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="py-8 text-center">
        <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-gray-200">
      <div className="space-y-4">
        {activities.map((activity) => {
          const config = getActivityConfig(activity.activityType);
          return (
            <div key={activity.id} className="relative">
              {/* Dot on the timeline */}
              <div className={`absolute -left-[22px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center ${config.color}`}>
                {config.icon}
              </div>

              <div className="pl-2">
                <p className="text-sm text-gray-900">{activity.description || activity.activityType}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatTime(activity.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
