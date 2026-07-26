// SitePilot AI — Customer Portal Appointments
// Route: /portal/appointments
// Placeholder page
import { Calendar } from "lucide-react";

export function CustomerAppointments() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Appointments</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No appointments yet</p>
        <p className="text-sm text-gray-400 mt-1">Your scheduled appointments will appear here.</p>
      </div>
    </div>
  );
}
