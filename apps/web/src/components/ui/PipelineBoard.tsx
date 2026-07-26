import { useState } from "react";
import { StageBadge, PriorityBadge } from "./StageBadge";
import { Phone, Mail, DollarSign } from "lucide-react";

interface LeadCard {
  id: string;
  title?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  stage: string;
  priority?: number | null;
  estimatedValue?: string | null;
  source?: string | null;
}

const STAGES = [
  { key: "new", label: "New", color: "border-l-blue-500" },
  { key: "contacted", label: "Contacted", color: "border-l-indigo-500" },
  { key: "qualified", label: "Qualified", color: "border-l-purple-500" },
  { key: "quote_sent", label: "Quote Sent", color: "border-l-amber-500" },
  { key: "approved", label: "Approved", color: "border-l-emerald-500" },
  { key: "job_scheduled", label: "Scheduled", color: "border-l-cyan-500" },
  { key: "completed", label: "Completed", color: "border-l-green-500" },
  { key: "lost", label: "Lost", color: "border-l-red-500" },
];

interface PipelineBoardProps {
  leads: LeadCard[];
  onCardClick: (lead: LeadCard) => void;
  onMoveLead: (leadId: string, newStage: string) => void;
}

export function PipelineBoard({ leads, onCardClick, onMoveLead }: PipelineBoardProps) {
  const [draggedLead, setDraggedLead] = useState<string | null>(null);

  const getLeadsByStage = (stage: string) =>
    leads.filter((l) => l.stage === stage);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4" style={{ minWidth: "1200px" }}>
        {STAGES.map((stage) => {
          const stageLeads = getLeadsByStage(stage.key);
          const totalValue = stageLeads.reduce(
            (sum, l) => sum + (parseFloat(l.estimatedValue ?? "0") || 0),
            0
          );

          return (
            <div
              key={stage.key}
              className={`flex-shrink-0 w-72 bg-gray-50 rounded-xl border border-gray-200 ${
                draggedLead ? "border-dashed border-blue-400" : ""
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedLead) {
                  onMoveLead(draggedLead, stage.key);
                  setDraggedLead(null);
                }
              }}
            >
              {/* Column header */}
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StageBadge stage={stage.key} size="sm" />
                    <span className="text-xs font-semibold text-gray-500 bg-gray-200 rounded-full px-2 py-0.5">
                      {stageLeads.length}
                    </span>
                  </div>
                </div>
                {totalValue > 0 && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />{totalValue.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 })}
                  </p>
                )}
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 min-h-[120px]">
                {stageLeads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => setDraggedLead(lead.id)}
                    onDragEnd={() => setDraggedLead(null)}
                    onClick={() => onCardClick(lead)}
                    className={`bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-shadow border-l-4 ${stage.color} ${draggedLead === lead.id ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {lead.contactName || lead.title || "Unnamed Lead"}
                        </p>
                        {lead.title && lead.contactName && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{lead.title}</p>
                        )}
                      </div>
                      {lead.priority != null && lead.priority > 0 && (
                        <PriorityBadge priority={lead.priority} />
                      )}
                    </div>

                    {/* Contact info */}
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                      {lead.contactPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {lead.contactPhone}
                        </span>
                      )}
                      {lead.contactEmail && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3" /> {lead.contactEmail}
                        </span>
                      )}
                    </div>

                    {lead.estimatedValue && (
                      <p className="text-xs font-semibold text-gray-700 mt-2">
                        {parseFloat(lead.estimatedValue).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
