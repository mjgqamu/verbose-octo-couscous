// SitePilot AI — Placeholder Page for dashboard sub-routes
import { DashboardLayout } from "./DashboardLayout";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
          <Construction className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-500">This section is coming soon. Our team is building it now.</p>
      </div>
    </DashboardLayout>
  );
}
