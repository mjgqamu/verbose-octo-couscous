// SitePilot AI — App Root with Routing
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { ProtectedRoute } from "./lib/ProtectedRoute";
import { ChatWidget } from "./features/ai-chat/ChatWidget";

// Auth pages
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { ForgotPasswordPage } from "./features/auth/ForgotPasswordPage";
import { UnauthorizedPage } from "./features/auth/UnauthorizedPage";
import { NotFoundPage } from "./features/auth/NotFoundPage";

// Dashboard
import { DashboardHome } from "./features/dashboard/DashboardHome";
import { PlaceholderPage } from "./features/dashboard/PlaceholderPage";

// CRM
import { LeadsListPage } from "./features/crm/LeadsListPage";
import { LeadDetailPage } from "./features/crm/LeadDetailPage";
import { CustomersListPage } from "./features/crm/CustomersListPage";
import { CustomerDetailPage } from "./features/crm/CustomerDetailPage";

// Calendar
import { CalendarPage } from "./features/calendar/CalendarPage";

// Follow-ups
import { FollowUpsPage } from "./features/follow-ups/FollowUpsPage";

// Jobs
import { JobsListPage } from "./features/jobs/JobsListPage";
import { JobDetailPage } from "./features/jobs/JobDetailPage";

// Invoices
import { InvoicesListPage } from "./features/invoices/InvoicesListPage";
import { InvoiceDetailPage } from "./features/invoices/InvoiceDetailPage";

// Technician
import { TechnicianDashboard } from "./features/technician/TechnicianDashboard";
import { TechnicianJobView } from "./features/technician/TechnicianJobView";

// Analytics
import { AnalyticsDashboard } from "./features/analytics/AnalyticsDashboard";

// Automations
import { AutomationsPage } from "./features/automations/AutomationsPage";

// Customer Portal
import { CustomerLayout } from "./features/customer-portal/CustomerLayout";
import { CustomerLoginPage } from "./features/customer-portal/CustomerLoginPage";
import { CustomerDashboard } from "./features/customer-portal/CustomerDashboard";
import { CustomerQuotes } from "./features/customer-portal/CustomerQuotes";
import { CustomerQuoteDetail } from "./features/customer-portal/CustomerQuoteDetail";
import { CustomerJobs } from "./features/customer-portal/CustomerJobs";
import { CustomerJobDetail } from "./features/customer-portal/CustomerJobDetail";
import { CustomerInvoices } from "./features/customer-portal/CustomerInvoices";
import { CustomerAppointments } from "./features/customer-portal/CustomerAppointments";

/**
 * Root redirect: if authenticated, route based on role.
 * Customers → /portal/dashboard, technicians → /dashboard/technician,
 * others → /dashboard.
 */
function RootRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === "customer") {
    return <Navigate to="/portal/dashboard" replace />;
  }

  if (user?.role === "technician") {
    return <Navigate to="/dashboard/technician" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected: Dashboard */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardHome />} />
            <Route path="/dashboard/leads" element={<LeadsListPage />} />
            <Route path="/dashboard/leads/:id" element={<LeadDetailPage />} />
            <Route path="/dashboard/customers" element={<CustomersListPage />} />
            <Route path="/dashboard/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/dashboard/calendar" element={<CalendarPage />} />
            <Route path="/dashboard/follow-ups" element={<FollowUpsPage />} />
            <Route path="/dashboard/missed-calls" element={<PlaceholderPage title="Missed Calls" />} />
            <Route path="/dashboard/jobs" element={<JobsListPage />} />
            <Route path="/dashboard/jobs/:id" element={<JobDetailPage />} />
            <Route path="/dashboard/invoices" element={<InvoicesListPage />} />
            <Route path="/dashboard/invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="/dashboard/technician" element={<TechnicianDashboard />} />
            <Route path="/dashboard/technician/jobs/:id" element={<TechnicianJobView />} />
            <Route path="/dashboard/quotes" element={<PlaceholderPage title="Quotes" />} />
            <Route path="/dashboard/messages" element={<PlaceholderPage title="Messages" />} />
            <Route path="/dashboard/settings" element={<PlaceholderPage title="Settings" />} />
            <Route path="/dashboard/admin" element={<PlaceholderPage title="Admin" />} />
          </Route>

          {/* Protected: Reports & Automations (business_owner only) */}
          <Route element={<ProtectedRoute allowedRoles={["business_owner"]} />}>
            <Route path="/dashboard/reports" element={<AnalyticsDashboard />} />
            <Route path="/dashboard/automations" element={<AutomationsPage />} />
          </Route>

          {/* Customer Portal — public login */}
          <Route path="/portal/login" element={<CustomerLoginPage />} />

          {/* Customer Portal — protected routes */}
          <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
            <Route element={<CustomerLayout />}>
              <Route path="/portal/dashboard" element={<CustomerDashboard />} />
              <Route path="/portal/quotes" element={<CustomerQuotes />} />
              <Route path="/portal/quotes/:id" element={<CustomerQuoteDetail />} />
              <Route path="/portal/appointments" element={<CustomerAppointments />} />
              <Route path="/portal/jobs" element={<CustomerJobs />} />
              <Route path="/portal/jobs/:id" element={<CustomerJobDetail />} />
              <Route path="/portal/invoices" element={<CustomerInvoices />} />
            </Route>
          </Route>

          {/* Landing: redirect based on role */}
          <Route path="/" element={<RootRedirect />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>

        {/* Floating AI chat widget — available on all pages */}
        <ChatWidget />
      </BrowserRouter>
    </AuthProvider>
  );
}
