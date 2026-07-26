// SitePilot AI — Customer Portal Layout
// Simple layout: top bar with business name left, customer name + logout right
// No sidebar. Centered content area, max-w-4xl.
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { LogOut, User } from "lucide-react";

export function CustomerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/portal/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Left: business name / brand */}
          <Link to="/portal/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {user?.orgName ?? "SitePilot"}
            </span>
          </Link>

          {/* Right: customer name + logout */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="hidden sm:inline font-medium">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition px-2 py-1.5 rounded-lg hover:bg-gray-100"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
