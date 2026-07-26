// SitePilot AI — Shared Types
export type { UserRole, LeadStage, LeadSource, JobStatus, QuoteStatus, InvoiceStatus, ConversationChannel, MessageRole, AppointmentStatus, PaymentMethod, SubscriptionStatus, AutomationTrigger, AutomationAction, PlanTier, BillingCycle, AiConfigType, UsageMetric, NotificationType } from '../constants/index.js';

// ---- Base Model ----
export interface BaseModel {
  id: string;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---- JSON primitive types ----
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = Record<string, JsonValue>;
