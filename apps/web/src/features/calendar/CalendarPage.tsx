// SitePilot AI — Calendar Page
import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "../dashboard/DashboardLayout";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { AppointmentModal } from "./AppointmentModal";
import { AppointmentDetail } from "./AppointmentDetail";

// ---- Types ----
interface Appointment {
  id: string;
  orgId: string;
  customerId: string;
  leadId?: string | null;
  title: string;
  description?: string | null;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  assignedTechnicians: string[];
  notes?: string | null;
  isAllDay: boolean;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  } | null;
}

interface AppointmentsResponse {
  data: Appointment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

interface TimeSlot {
  date: string;
  time: string;
  slot: string;
}

type CalendarView = "month" | "week" | "day";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_BG: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  confirmed: "bg-blue-200 text-blue-900 border-blue-300",
  in_progress: "bg-orange-100 text-orange-800 border-orange-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  no_show: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

export function CalendarPage() {
  const { user } = useAuth();
  const [view, setView] = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  const orgId = user?.orgId;

  // Fetch appointments for current view
  const fetchAppointments = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      let dateFrom: string, dateTo: string;

      if (view === "month") {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        dateFrom = new Date(year, month, 1).toISOString().split("T")[0]!;
        dateTo = new Date(year, month + 1, 0).toISOString().split("T")[0]!;
      } else if (view === "week") {
        const start = new Date(currentDate);
        start.setDate(start.getDate() - start.getDay());
        dateFrom = start.toISOString().split("T")[0]!;
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        dateTo = end.toISOString().split("T")[0]!;
      } else {
        dateFrom = currentDate.toISOString().split("T")[0]!;
        dateTo = dateFrom;
      }

      const res = await api.get<AppointmentsResponse>(
        `/api/v1/orgs/${orgId}/appointments?dateFrom=${dateFrom}&dateTo=${dateTo}&limit=200`,
      );

      if (res.data) {
        setAppointments(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
    } finally {
      setLoading(false);
    }
  }, [orgId, view, currentDate]);

  // Fetch available time slots for create modal
  const fetchTimeSlots = useCallback(async (date: string) => {
    if (!orgId) return;
    try {
      const res = await api.get<{ data: { slots: TimeSlot[] } }>(
        `/api/v1/orgs/${orgId}/availability?date=${date}&daysAhead=7`,
      );
      if (res.data?.data?.slots) {
        setTimeSlots(res.data.data.slots);
      }
    } catch (err) {
      console.error("Failed to fetch time slots:", err);
    }
  }, [orgId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Navigation
  const navigate = (direction: -1 | 1) => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (view === "month") next.setMonth(next.getMonth() + direction);
      else if (view === "week") next.setDate(next.getDate() + direction * 7);
      else next.setDate(next.getDate() + direction);
      return next;
    });
  };

  const goToToday = () => setCurrentDate(new Date());

  // Header text
  const headerText = useMemo(() => {
    if (view === "month") {
      return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else if (view === "week") {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} — ${MONTH_NAMES[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
    } else {
      return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
    }
  }, [view, currentDate]);

  // Get appointments for a specific date
  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0]!;
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.scheduledStart).toISOString().split("T")[0];
      return aptDate === dateStr;
    });
  };

  // Month view grid
  const monthGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const grid: (Date | null)[] = [];
    for (let i = 0; i < startDay; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(new Date(year, month, d));
    while (grid.length % 7 !== 0) grid.push(null);

    return grid;
  }, [currentDate]);

  // Week view
  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const handleSlotClick = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0]!;
    fetchTimeSlots(dateStr);
    setShowCreateModal(true);
  };

  const handleAppointmentClick = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setDetailOpen(true);
  };

  const handleAppointmentCreated = () => {
    setShowCreateModal(false);
    fetchAppointments();
  };

  const handleAppointmentUpdated = () => {
    setDetailOpen(false);
    setSelectedAppointment(null);
    fetchAppointments();
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <div className="flex items-center bg-white rounded-lg border border-gray-200 p-0.5">
            {(["month", "week", "day"] as CalendarView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize transition ${
                  view === v ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 min-w-[200px] text-center">
            {headerText}
          </h2>
          <button
            onClick={() => navigate(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={goToToday}
            className="ml-2 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            Today
          </button>
          <button
            onClick={() => {
              const today = new Date();
              fetchTimeSlots(today.toISOString().split("T")[0]!);
              setShowCreateModal(true);
            }}
            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>
      </div>

      {/* Month View */}
      {view === "month" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7">
            {monthGrid.map((date, idx) => (
              <div
                key={idx}
                className={`min-h-[100px] border-b border-r border-gray-100 p-1.5 ${
                  date ? "cursor-pointer hover:bg-gray-50" : "bg-gray-50/50"
                } ${idx % 7 === 6 ? "border-r-0" : ""}`}
                onClick={() => date && handleSlotClick(date)}
              >
                {date && (
                  <>
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 text-sm rounded-full ${
                        isToday(date) ? "bg-blue-600 text-white font-bold" : "text-gray-700"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {getAppointmentsForDate(date)
                        .slice(0, 3)
                        .map((apt) => (
                          <div
                            key={apt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAppointmentClick(apt);
                            }}
                            className={`px-1.5 py-0.5 text-xs rounded truncate border ${STATUS_BG[apt.status] ?? "bg-gray-100 border-gray-200 text-gray-700"}`}
                            title={apt.title}
                          >
                            {formatTime(apt.scheduledStart)} {apt.title}
                          </div>
                        ))}
                      {getAppointmentsForDate(date).length > 3 && (
                        <p className="text-xs text-gray-400 pl-1">
                          +{getAppointmentsForDate(date).length - 3} more
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Week View */}
      {view === "week" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-7">
            {weekDays.map((day, idx) => (
              <div
                key={idx}
                className={`border-r border-b border-gray-100 min-h-[300px] p-2 cursor-pointer hover:bg-gray-50 ${
                  idx === 6 ? "border-r-0" : ""
                }`}
                onClick={() => handleSlotClick(day)}
              >
                <div className="text-center mb-2">
                  <p className="text-xs text-gray-500 uppercase">{WEEKDAYS[day.getDay()]}</p>
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 text-sm rounded-full ${
                      isToday(day) ? "bg-blue-600 text-white font-bold" : "text-gray-700"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>
                <div className="space-y-1">
                  {getAppointmentsForDate(day).map((apt) => (
                    <div
                      key={apt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAppointmentClick(apt);
                      }}
                      className={`px-2 py-1 text-xs rounded border ${STATUS_BG[apt.status] ?? "bg-gray-100 border-gray-200 text-gray-700"}`}
                    >
                      <p className="font-medium truncate">{formatTime(apt.scheduledStart)}</p>
                      <p className="truncate">{apt.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day View */}
      {view === "day" && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="space-y-2">
            {Array.from({ length: 10 }, (_, i) => {
              const hour = 8 + i;
              const timeLabel = `${String(hour).padStart(2, "0")}:00`;
              const dayApps = appointments.filter((apt) => {
                const aptHour = new Date(apt.scheduledStart).getHours();
                return aptHour === hour;
              });

              return (
                <div
                  key={hour}
                  className="flex gap-4 min-h-[60px] border-b border-gray-50 py-2 cursor-pointer hover:bg-gray-50 rounded px-2"
                  onClick={() => handleSlotClick(currentDate)}
                >
                  <div className="w-16 text-sm text-gray-500 pt-1">{timeLabel}</div>
                  <div className="flex-1 flex flex-wrap gap-2">
                    {dayApps.map((apt) => (
                      <div
                        key={apt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAppointmentClick(apt);
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-sm ${STATUS_BG[apt.status] ?? "bg-gray-100 border-gray-200 text-gray-700"}`}
                      >
                        <p className="font-medium">{apt.title}</p>
                        <p className="text-xs opacity-75">
                          {formatTime(apt.scheduledStart)} – {formatTime(apt.scheduledEnd)}
                        </p>
                      </div>
                    ))}
                    {dayApps.length === 0 && (
                      <span className="text-sm text-gray-300 italic py-1">Available</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="flex items-center justify-center py-10">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <AppointmentModal
          orgId={orgId!}
          timeSlots={timeSlots}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleAppointmentCreated}
        />
      )}

      {/* Detail Slide-over */}
      {detailOpen && selectedAppointment && (
        <AppointmentDetail
          appointment={selectedAppointment}
          orgId={orgId!}
          onClose={() => {
            setDetailOpen(false);
            setSelectedAppointment(null);
          }}
          onUpdated={handleAppointmentUpdated}
        />
      )}
    </DashboardLayout>
  );
}
