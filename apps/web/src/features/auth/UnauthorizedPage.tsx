// SitePilot AI — 403 Unauthorized Page
import { Link } from "react-router-dom";
import { ShieldOff } from "lucide-react";

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShieldOff className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-8">
          You don&apos;t have permission to view this page. Contact your administrator if you think this is a mistake.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
