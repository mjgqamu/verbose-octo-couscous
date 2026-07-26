// SitePilot AI — Protected Route & Role Guard
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";
import type { UserRole } from "@sitepilot/shared";

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && user) {
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
}

interface RequireRoleProps {
  roles: UserRole | UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequireRole({ roles, children, fallback }: RequireRoleProps) {
  const { hasRole } = useAuth();
  const allowed = Array.isArray(roles) ? roles : [roles];

  if (!hasRole(allowed)) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
