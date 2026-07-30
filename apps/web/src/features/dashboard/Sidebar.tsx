// SitePilot AI — Dashboard Sidebar
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import type { UserRole } from "@sitepilot/shared";
import {
  Home,
  Users,
  Building,
  Calendar,
  Wrench,
  FileText,
  DollarSign,
  MessageSquare,
  BarChart,
  Settings,
  Shield,
  Menu,
  X,
  ChevronLeft,
  Bell,
  Phone,
  Zap,
} from "lucide-react";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: <Home className="w-5 h-5" />, path: "/dashboard", roles: ["platform_admin", "business_owner", "office_admin", "dispatcher", "sales_rep", "customer"] },
  { label: "Dashboard", icon: <Home className="w-5 h-5" />, path: "/dashboard/technician", roles: ["technician"] },
  { label: "Leads", icon: <Users className="w-5 h-5" />, path: "/dashboard/leads", roles: ["business_owner", "office_admin"] },
  { label: "Customers", icon: <Building className="w-5 h-5" />, path: "/dashboard/customers", roles: ["business_owner", "office_admin"] },
  { label: "Calendar", icon: <Calendar className="w-5 h-5" />, path: "/dashboard/calendar", roles: ["business_owner", "office_admin", "technician"] },
  { label: "Follow-ups", icon: <Bell className="w-5 h-5" />, path: "/dashboard/follow-ups", roles: ["business_owner", "office_admin"] },
  { label: "Calls", icon: <Phone className="w-5 h-5" />, path: "/dashboard/missed-calls", roles: ["business_owner", "office_admin"] },
  { label: "Jobs", icon: <Wrench className="w-5 h-5" />, path: "/dashboard/jobs", roles: ["business_owner", "office_admin"] },
  { label: "My Jobs", icon: <Wrench className="w-5 h-5" />, path: "/dashboard/technician", roles: ["technician"] },
  { label: "Quotes", icon: <FileText className="w-5 h-5" />, path: "/dashboard/quotes", roles: ["business_owner", "office_admin"] },
  { label: "Invoices", icon: <DollarSign className="w-5 h-5" />, path: "/dashboard/invoices", roles: ["business_owner", "office_admin"] },
  { label: "Messages", icon: <MessageSquare className="w-5 h-5" />, path: "/dashboard/messages", roles: ["business_owner", "office_admin"] },
  { label: "Reports", icon: <BarChart className="w-5 h-5" />, path: "/dashboard/reports", roles: ["business_owner"] },
  { label: "Automations", icon: <Zap className="w-5 h-5" />, path: "/dashboard/automations", roles: ["business_owner"] },
  { label: "Settings", icon: <Settings className="w-5 h-5" />, path: "/dashboard/settings", roles: ["business_owner"] },
  { label: "Admin", icon: <Shield className="w-5 h-5" />, path: "/dashboard/admin", roles: ["platform_admin"] },
];

export function Sidebar() {
  const { user, hasRole } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredItems = navItems.filter((item) => hasRole(item.roles));

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    if (path === "/dashboard/technician") {
      return location.pathname === "/dashboard/technician" || location.pathname.startsWith("/dashboard/technician/");
    }
    return location.pathname.startsWith(path);
  };

  const sidebarContent = (
    <div className={`flex flex-col h-full bg-navy-900 text-white ${collapsed && !mobileOpen ? "w-16" : "w-64"} transition-all duration-200`}>
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-navy-700">
        {(!collapsed || mobileOpen) && (
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">SitePilot</span>
          </Link>
        )}
        {collapsed && !mobileOpen && (
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mx-auto">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        )}
        {/* Desktop collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:block text-navy-400 hover:text-white transition p-1"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden text-navy-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-navy-200 hover:bg-navy-800 hover:text-white"
              } ${collapsed && !mobileOpen ? "justify-center" : ""}`}
              title={collapsed && !mobileOpen ? item.label : undefined}
            >
              {item.icon}
              {(!collapsed || mobileOpen) && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User info at bottom */}
      {user && (!collapsed || mobileOpen) && (
        <div className="p-4 border-t border-navy-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-navy-400 truncate">{user.orgName ?? user.email}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-50 lg:hidden transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block h-screen sticky top-0">
        {sidebarContent}
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-30 p-2 bg-navy-900 text-white rounded-lg shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>
    </>
  );
}
