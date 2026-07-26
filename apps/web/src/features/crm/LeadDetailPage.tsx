import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { DashboardLayout } from "../dashboard/DashboardLayout";
import { RequireRole } from "../../lib/ProtectedRoute";
import { StageBadge, SourceBadge, ScoreBadge, ActivityTimeline } from "../../components/ui";
import type { Activity } from "../../components/ui";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  MessageSquare,
  FileText,
  User,
  ChevronRight,
  Plus,
  Clock,
  Target,
  Brain,
} from "lucide-react";

interface LeadDetail {
  id: string;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  source: string;
  sourceDetail?: string | null;
  stage: string;
  priority?: number | null;
  title?: string | null;
  description?: string | null;
  serviceType?: string | null;
  estimatedValue?: string | null;
  dealSize?: string | null;
  nextFollowUp?: string | null;
  lostReason?: string | null;
  tags?: string[] | null;
  createdAt: string;
  updatedAt: string;
  aiScore?: number | null;
  aiScoreBreakdown?: {
    urgency: number;
    clarity: number;
    budget: number;
    completeness: number;
    engagement: number;
  } | null;
  aiAnalysis?: string | null;
  aiCategory?: string | null;
  aiActions?: string[] | null;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    addressLine1?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
  assignedUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  activities: Activity[];
  conversations: {
    id: string;
    channel: string;
    subject?: string | null;
    status: string;
    lastMessageAt?: string | null;
    messageCount?: number | null;
  }[];
  calls: {
    id: string;
    direction: string;
    status: string;
    duration?: number | null;
    summary?: string | null;
    startedAt?: string | null;
  }[];
}

const STAGES = ["new", "contacted", "qualified", "quote_sent", "approved", "job_scheduled", "completed", "lost"];

export function LeadDetailPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageUpdating, setStageUpdating] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [scoring, setScoring] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get<{ data: LeadDetail }>(`/api/v1/orgs/${user!.orgId}/leads/${id}`).then((res) => {
      if (res.data) setLead(res.data.data);
      setLoading(false);
    });
  }, [id, user]);

  const handleStageChange = async (newStage: string) => {
    if (!lead) return;
    setStageUpdating(true);
    const res = await api.patch<{ data: LeadDetail }>(`/api/v1/orgs/${user!.orgId}/leads/${lead.id}`, { stage: newStage });
    if (res.data) {
      // Add activity for stage change
      await api.post(`/api/v1/orgs/${user!.orgId}/leads/${lead.id}/activities`, {
        activityType: "stage_change",
        description: `Stage changed to ${newStage.replace(/_/g, " ")}`,
      });
      setLead(res.data.data as unknown as LeadDetail);
    }
    setStageUpdating(false);
  };

  const handleScoreLead = async () => {
    if (!lead) return;
    setScoring(true);
    try {
      const res = await api.post<{ data: { score: number; breakdown: { urgency: number; clarity: number; budget: number; completeness: number; engagement: number }; analysis: string } }>(
        `/api/v1/orgs/${user!.orgId}/leads/${lead.id}/score`
      );
      if (res.data) {
        // Re-fetch lead to get updated data from server
        const refreshed = await api.get<{ data: LeadDetail }>(`/api/v1/orgs/${user!.orgId}/leads/${lead.id}`);
        if (refreshed.data) {
          setLead(refreshed.data.data);
        }
      }
    } catch (err) {
      console.error("Scoring failed:", err);
    }
    setScoring(false);
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !lead) return;
    setAddingNote(true);
    const res = await api.post(`/api/v1/orgs/${user!.orgId}/leads/${lead.id}/activities`, {
      activityType: "note",
      description: noteText.trim(),
    });
    if (res.data) {
      setLead({
        ...lead,
        activities: [res.data as unknown as Activity, ...lead.activities],
      });
      setNoteText("");
      setShowNoteInput(false);
    }
    setAddingNote(false);
  };

  const currentStageIndex = STAGES.indexOf(lead?.stage ?? "");

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-40 bg-gray-200 rounded-xl" />
              <div className="h-60 bg-gray-200 rounded-xl" />
            </div>
            <div className="h-80 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!lead) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <p className="text-gray-500">Lead not found.</p>
          <button onClick={() => navigate("/dashboard/leads")} className="mt-4 text-blue-600 hover:underline text-sm font-medium">Back to leads</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <RequireRole roles={["business_owner", "office_admin"]}>
        {/* Breadcrumb */}
        <button
          onClick={() => navigate("/dashboard/leads")}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Leads
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lead.contactName || lead.title || "Unnamed Lead"}
            </h1>
            {lead.contactName && lead.title && (
              <p className="text-sm text-gray-500 mt-0.5">{lead.title}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StageBadge stage={lead.stage} />
            <select
              value={lead.stage}
              onChange={(e) => handleStageChange(e.target.value)}
              disabled={stageUpdating}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content: left 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stage progression tracker */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Pipeline Progress</h3>
              <div className="flex items-center gap-1">
                {STAGES.map((stage, idx) => {
                  const isPast = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;
                  const isLost = stage === "lost" && isCurrent;

                  return (
                    <div key={stage} className="flex-1 flex items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                            isLost
                              ? "bg-red-100 text-red-700 border-2 border-red-300"
                              : isPast
                              ? "bg-green-500 text-white"
                              : isCurrent
                              ? "bg-blue-600 text-white ring-4 ring-blue-100"
                              : "bg-gray-100 text-gray-400"
                          }`}
                          title={stage.replace(/_/g, " ")}
                        >
                          {isPast ? "✓" : idx + 1}
                        </div>
                        <span className={`text-[10px] mt-1 font-medium text-center ${isCurrent ? "text-blue-600" : "text-gray-400"}`}>
                          {stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                      </div>
                      {idx < STAGES.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-1 mb-5 ${idx < currentStageIndex ? "bg-green-500" : "bg-gray-200"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lead info card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Lead Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoItem icon={<Phone className="w-4 h-4" />} label="Phone" value={lead.contactPhone} />
                <InfoItem icon={<Mail className="w-4 h-4" />} label="Email" value={lead.contactEmail} />
                <InfoItem icon={<FileText className="w-4 h-4" />} label="Source" value={<SourceBadge source={lead.source} />} />
                <InfoItem icon={<DollarSign className="w-4 h-4" />} label="Est. Value" value={lead.estimatedValue ? parseFloat(lead.estimatedValue).toLocaleString("en-US", { style: "currency", currency: "USD" }) : "—"} />
                <InfoItem icon={<User className="w-4 h-4" />} label="Assigned To" value={lead.assignedUser ? `${lead.assignedUser.firstName} ${lead.assignedUser.lastName}` : "Unassigned"} />
                <InfoItem icon={<Clock className="w-4 h-4" />} label="Next Follow-up" value={lead.nextFollowUp ? new Date(lead.nextFollowUp).toLocaleDateString() : "Not set"} />
                {lead.serviceType && <InfoItem icon={<Target className="w-4 h-4" />} label="Service" value={lead.serviceType} />}
                {lead.description && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-500 font-medium mb-1">Description</p>
                    <p className="text-sm text-gray-700">{lead.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Customer linked info */}
            {lead.customer && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Customer</h3>
                  <button
                    onClick={() => navigate(`/dashboard/customers/${lead.customer!.id}`)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    View Profile <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                    {lead.customer.firstName[0]}{lead.customer.lastName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{lead.customer.firstName} {lead.customer.lastName}</p>
                    {lead.customer.company && <p className="text-xs text-gray-500">{lead.customer.company}</p>}
                    {lead.customer.city && lead.customer.state && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {lead.customer.city}, {lead.customer.state}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Activity + Notes */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Activity</h3>
                <button
                  onClick={() => setShowNoteInput(!showNoteInput)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Note
                </button>
              </div>

              {showNoteInput && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none bg-white"
                    placeholder="Add a note..."
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => { setShowNoteInput(false); setNoteText(""); }}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddNote}
                      disabled={!noteText.trim() || addingNote}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition disabled:opacity-50"
                    >
                      {addingNote ? "Saving..." : "Save Note"}
                    </button>
                  </div>
                </div>
              )}

              <ActivityTimeline activities={lead.activities} />
            </div>

            {/* Conversations */}
            {lead.conversations.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Conversations</h3>
                <div className="space-y-2">
                  {lead.conversations.map((conv) => (
                    <div key={conv.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {conv.subject || `${conv.channel} conversation`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {conv.messageCount ?? 0} messages • via {conv.channel}
                        </p>
                      </div>
                      {conv.lastMessageAt && (
                        <span className="text-xs text-gray-400">{new Date(conv.lastMessageAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar: AI insights + quick actions */}
          <div className="space-y-4">
            {/* AI Insights Panel */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-blue-900">AI Insights</h3>
              </div>

              {lead.aiScore != null ? (
                <div className="space-y-4">
                  {/* Score display */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-blue-700 font-medium">Lead Score</p>
                    <ScoreBadge score={lead.aiScore} size="md" />
                  </div>

                  {/* Score bar */}
                  <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        lead.aiScore >= 81 ? "bg-green-500" :
                        lead.aiScore >= 61 ? "bg-blue-500" :
                        lead.aiScore >= 31 ? "bg-amber-500" :
                        "bg-red-500"
                      }`}
                      style={{ width: `${lead.aiScore}%` }}
                    />
                  </div>

                  {/* Breakdown bars */}
                  {lead.aiScoreBreakdown && (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs text-blue-700 font-medium mb-1">Score Breakdown</p>
                      {([
                        { key: "urgency", label: "Urgency", value: lead.aiScoreBreakdown.urgency },
                        { key: "clarity", label: "Clarity", value: lead.aiScoreBreakdown.clarity },
                        { key: "budget", label: "Budget", value: lead.aiScoreBreakdown.budget },
                        { key: "completeness", label: "Completeness", value: lead.aiScoreBreakdown.completeness },
                        { key: "engagement", label: "Engagement", value: lead.aiScoreBreakdown.engagement },
                      ] as const).map((dim) => (
                        <div key={dim.key}>
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-[11px] text-blue-700">{dim.label}</span>
                            <span className="text-[11px] font-medium text-blue-900">{dim.value}/20</span>
                          </div>
                          <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                dim.value >= 16 ? "bg-green-500" :
                                dim.value >= 11 ? "bg-blue-500" :
                                dim.value >= 6 ? "bg-amber-500" :
                                "bg-red-400"
                              }`}
                              style={{ width: `${(dim.value / 20) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AI Analysis */}
                  {lead.aiAnalysis && (
                    <div className="pt-2 border-t border-blue-200">
                      <p className="text-xs text-blue-700 font-medium mb-1">Analysis</p>
                      <p className="text-xs text-blue-800 leading-relaxed">{lead.aiAnalysis}</p>
                    </div>
                  )}

                  {/* Suggested Actions */}
                  {lead.aiActions && lead.aiActions.length > 0 && (
                    <div className="pt-2 border-t border-blue-200">
                      <p className="text-xs text-blue-700 font-medium mb-2">Suggested Actions</p>
                      <div className="flex flex-wrap gap-1.5">
                        {lead.aiActions.map((action, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2.5 py-1 text-[11px] font-medium rounded-full bg-blue-100 text-blue-700 border border-blue-200 cursor-default"
                          >
                            {action}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Re-score button */}
                  <button
                    onClick={handleScoreLead}
                    disabled={scoring}
                    className="w-full mt-1 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-lg transition disabled:opacity-50"
                  >
                    {scoring ? "Scoring..." : "Re-score Lead"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-center py-4">
                  <p className="text-xs text-blue-700">This lead hasn't been scored yet.</p>
                  <button
                    onClick={handleScoreLead}
                    disabled={scoring}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 shadow-sm"
                  >
                    <Brain className="w-4 h-4" />
                    {scoring ? "Scoring..." : "Score this Lead"}
                  </button>
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Create Quote
                </button>
                <button className="w-full text-left px-3 py-2.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Schedule Appointment
                </button>
                <button
                  onClick={() => setShowNoteInput(true)}
                  className="w-full text-left px-3 py-2.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Note
                </button>
                {lead.contactPhone && (
                  <a href={`tel:${lead.contactPhone}`} className="w-full text-left px-3 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Call {lead.contactPhone}
                  </a>
                )}
              </div>
            </div>

            {/* Calls log */}
            {lead.calls.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Call History</h3>
                <div className="space-y-2">
                  {lead.calls.map((call) => (
                    <div key={call.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                      <Phone className={`w-4 h-4 ${call.direction === "inbound" ? "text-green-500" : "text-blue-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700">{call.direction === "inbound" ? "Incoming" : "Outgoing"} call</p>
                        {call.duration && <p className="text-xs text-gray-500">{Math.floor(call.duration / 60)}m {call.duration % 60}s</p>}
                      </div>
                      {call.startedAt && (
                        <span className="text-xs text-gray-400">{new Date(call.startedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </RequireRole>
    </DashboardLayout>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode | string | null | undefined }) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-gray-400 mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <div className="text-sm text-gray-900">{value || <span className="text-gray-400">—</span>}</div>
      </div>
    </div>
  );
}
