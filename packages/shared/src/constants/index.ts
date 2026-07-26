// ============================================================
// SitePilot AI — Shared Constants
// ============================================================

// ---- User Roles ----
export const USER_ROLES = [
  'platform_admin',
  'business_owner',
  'office_admin',
  'dispatcher',
  'technician',
  'sales_rep',
  'customer',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

// ---- Lead Stages ----
export const LEAD_STAGES = [
  'new',
  'contacted',
  'qualified',
  'quote_sent',
  'approved',
  'job_scheduled',
  'completed',
  'lost',
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

// ---- Lead Sources ----
export const LEAD_SOURCES = [
  'phone_call',
  'website_chat',
  'website_form',
  'whatsapp',
  'email',
  'facebook',
  'google_business',
  'referral',
  'repeat_customer',
  'walk_in',
  'other',
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

// ---- Job Statuses ----
export const JOB_STATUSES = [
  'new',
  'scheduled',
  'assigned',
  'in_progress',
  'waiting_on_parts',
  'waiting_on_customer',
  'completed',
  'cancelled',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

// ---- Quote Statuses ----
export const QUOTE_STATUSES = [
  'draft',
  'sent',
  'viewed',
  'accepted',
  'declined',
  'expired',
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

// ---- Invoice Statuses ----
export const INVOICE_STATUSES = [
  'draft',
  'sent',
  'viewed',
  'paid',
  'partially_paid',
  'overdue',
  'cancelled',
  'refunded',
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

// ---- Conversation Channels ----
export const CONVERSATION_CHANNELS = [
  'voice',
  'chat',
  'whatsapp',
  'email',
  'sms',
  'facebook_messenger',
] as const;

export type ConversationChannel = (typeof CONVERSATION_CHANNELS)[number];

// ---- Message Roles ----
export const MESSAGE_ROLES = ['human', 'ai', 'system'] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

// ---- Appointment Statuses ----
export const APPOINTMENT_STATUSES = [
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'no_show',
  'cancelled',
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

// ---- Payment Methods ----
export const PAYMENT_METHODS = [
  'credit_card',
  'debit_card',
  'bank_transfer',
  'cash',
  'check',
  'stripe',
  'other',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// ---- Subscription Statuses ----
export const SUBSCRIPTION_STATUSES = [
  'active',
  'past_due',
  'cancelled',
  'trialing',
  'incomplete',
  'paused',
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

// ---- Automation Triggers ----
export const AUTOMATION_TRIGGERS = [
  'lead_created',
  'lead_stage_changed',
  'job_created',
  'job_completed',
  'quote_accepted',
  'quote_declined',
  'invoice_paid',
  'invoice_overdue',
  'appointment_booked',
  'appointment_reminder',
  'call_missed',
  'message_received',
  'review_received',
  'customer_birthday',
  'schedule_recurring',
] as const;

export type AutomationTrigger = (typeof AUTOMATION_TRIGGERS)[number];

// ---- Automation Actions ----
export const AUTOMATION_ACTIONS = [
  'send_email',
  'send_sms',
  'send_whatsapp',
  'create_task',
  'update_lead_stage',
  'assign_user',
  'send_quote',
  'create_job',
  'webhook',
  'ai_response',
] as const;

export type AutomationAction = (typeof AUTOMATION_ACTIONS)[number];

// ---- Subscription Plan Tiers ----
export const PLAN_TIERS = ['starter', 'professional', 'enterprise'] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

// ---- Billing Cycles ----
export const BILLING_CYCLES = ['monthly', 'annual'] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

// ---- AI Config Types ----
export const AI_CONFIG_TYPES = [
  'receptionist',
  'sales_agent',
  'support',
  'follow_up',
] as const;

export type AiConfigType = (typeof AI_CONFIG_TYPES)[number];

// ---- Usage Metrics ----
export const USAGE_METRICS = [
  'ai_voice_minutes',
  'sms_messages',
  'whatsapp_messages',
  'document_generations',
] as const;

export type UsageMetric = (typeof USAGE_METRICS)[number];

// ---- Notification Types ----
export const NOTIFICATION_TYPES = [
  'lead_assigned',
  'job_update',
  'payment_received',
  'review_left',
  'ai_escalation',
  'appointment_reminder',
  'quote_update',
  'invoice_update',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
