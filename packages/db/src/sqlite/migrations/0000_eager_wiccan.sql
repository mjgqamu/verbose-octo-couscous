CREATE TABLE `ai_configurations` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`config_type` text NOT NULL,
	`model` text DEFAULT 'gpt-4o' NOT NULL,
	`system_prompt` text NOT NULL,
	`personality` text DEFAULT '{}',
	`knowledge_base` text DEFAULT '[]',
	`tools_enabled` text DEFAULT '[]',
	`fallback_action` text DEFAULT 'escalate',
	`escalation_rules` text DEFAULT '{}',
	`voice_id` text,
	`language` text DEFAULT 'en',
	`max_turns` integer DEFAULT 20,
	`is_active` integer DEFAULT false,
	`is_default` integer DEFAULT false,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_ai_configs_org` ON `ai_configurations` (`org_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_ai_configs_org_type` ON `ai_configurations` (`org_id`,`config_type`);--> statement-breakpoint
CREATE TABLE `ai_knowledge_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`ai_config_id` text,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`content_type` text DEFAULT 'text',
	`metadata` text DEFAULT '{}',
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ai_config_id`) REFERENCES `ai_configurations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_ai_knowledge_org` ON `ai_knowledge_documents` (`org_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_knowledge_config` ON `ai_knowledge_documents` (`ai_config_id`);--> statement-breakpoint
CREATE TABLE `analytics_events` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`user_id` text,
	`event_name` text NOT NULL,
	`event_category` text NOT NULL,
	`properties` text DEFAULT '{}',
	`session_id` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_analytics_org_time` ON `analytics_events` (`org_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_analytics_org_event` ON `analytics_events` (`org_id`,`event_name`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_analytics_org_category` ON `analytics_events` (`org_id`,`event_category`,`created_at`);--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`key_hash` text NOT NULL,
	`key_prefix` text NOT NULL,
	`scopes` text DEFAULT '[]',
	`last_used_at` integer,
	`expires_at` integer,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_api_keys_org` ON `api_keys` (`org_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_api_keys_hash` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`lead_id` text,
	`job_id` text,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`scheduled_start` integer NOT NULL,
	`scheduled_end` integer NOT NULL,
	`actual_start` integer,
	`actual_end` integer,
	`timezone` text NOT NULL,
	`assigned_technicians` text DEFAULT '[]',
	`address_line1` text,
	`address_line2` text,
	`city` text,
	`state` text,
	`postal_code` text,
	`latitude` real,
	`longitude` real,
	`notes` text,
	`is_all_day` integer DEFAULT false,
	`recurrence_rule` text,
	`google_event_id` text,
	`reminder_sent_at` integer,
	`confirmation_sent_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_appointments_org` ON `appointments` (`org_id`);--> statement-breakpoint
CREATE INDEX `idx_appointments_org_range` ON `appointments` (`org_id`,`scheduled_start`,`scheduled_end`);--> statement-breakpoint
CREATE INDEX `idx_appointments_customer` ON `appointments` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_appointments_job` ON `appointments` (`job_id`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`changes` text DEFAULT '{}',
	`ip_address` text,
	`user_agent` text,
	`request_id` text,
	`metadata` text DEFAULT '{}',
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_audit_org` ON `audit_logs` (`org_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_org_time` ON `audit_logs` (`org_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_entity` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_user` ON `audit_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_action` ON `audit_logs` (`org_id`,`action`,`created_at`);--> statement-breakpoint
CREATE TABLE `automation_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`automation_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`trigger_entity_type` text NOT NULL,
	`trigger_entity_id` text NOT NULL,
	`result` text DEFAULT '{}',
	`error_message` text,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`automation_id`) REFERENCES `automations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_automation_runs_org` ON `automation_runs` (`org_id`);--> statement-breakpoint
CREATE INDEX `idx_automation_runs_automation` ON `automation_runs` (`automation_id`);--> statement-breakpoint
CREATE TABLE `automations` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`trigger` text NOT NULL,
	`trigger_config` text DEFAULT '{}',
	`conditions` text DEFAULT '[]',
	`action` text NOT NULL,
	`action_config` text DEFAULT '{}',
	`is_active` integer DEFAULT true,
	`delay_minutes` integer DEFAULT 0,
	`last_triggered_at` integer,
	`run_count` integer DEFAULT 0,
	`created_by` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_automations_org` ON `automations` (`org_id`);--> statement-breakpoint
CREATE INDEX `idx_automations_trigger` ON `automations` (`org_id`,`trigger`);--> statement-breakpoint
CREATE TABLE `calls` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`conversation_id` text,
	`lead_id` text,
	`customer_id` text,
	`twilio_call_sid` text,
	`from_number` text NOT NULL,
	`to_number` text NOT NULL,
	`direction` text NOT NULL,
	`status` text NOT NULL,
	`duration` integer,
	`recording_url` text,
	`transcription` text,
	`summary` text,
	`sentiment` text,
	`intent` text,
	`ai_handled` integer DEFAULT false,
	`ai_handoff_at` integer,
	`started_at` integer,
	`ended_at` integer,
	`metadata` text DEFAULT '{}',
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calls_twilio_call_sid_unique` ON `calls` (`twilio_call_sid`);--> statement-breakpoint
CREATE INDEX `idx_calls_org` ON `calls` (`org_id`);--> statement-breakpoint
CREATE INDEX `idx_calls_org_timestamp` ON `calls` (`org_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `idx_calls_customer` ON `calls` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_calls_lead` ON `calls` (`lead_id`);--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`customer_id` text,
	`lead_id` text,
	`channel` text NOT NULL,
	`external_id` text,
	`subject` text,
	`status` text DEFAULT 'active',
	`assigned_to` text,
	`is_ai_handled` integer DEFAULT false,
	`ai_escalated` integer DEFAULT false,
	`escalation_reason` text,
	`last_message_at` integer,
	`message_count` integer DEFAULT 0,
	`metadata` text DEFAULT '{}',
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_conversations_org` ON `conversations` (`org_id`);--> statement-breakpoint
CREATE INDEX `idx_conversations_customer` ON `conversations` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_conversations_external` ON `conversations` (`external_id`);--> statement-breakpoint
CREATE INDEX `idx_conversations_org_channel` ON `conversations` (`org_id`,`channel`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`company` text,
	`email` text,
	`phone` text,
	`phone_alt` text,
	`address_line1` text,
	`address_line2` text,
	`city` text,
	`state` text,
	`postal_code` text,
	`country` text,
	`latitude` real,
	`longitude` real,
	`source` text,
	`tags` text DEFAULT '[]',
	`notes` text,
	`custom_fields` text DEFAULT '{}',
	`lifetime_value` real DEFAULT 0,
	`total_jobs` integer DEFAULT 0,
	`last_job_at` integer,
	`stripe_customer_id` text,
	`portal_enabled` integer DEFAULT false,
	`deleted_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_customers_org` ON `customers` (`org_id`);--> statement-breakpoint
CREATE INDEX `idx_customers_org_name` ON `customers` (`org_id`,`last_name`,`first_name`);--> statement-breakpoint
CREATE INDEX `idx_customers_org_phone` ON `customers` (`org_id`,`phone`);--> statement-breakpoint
CREATE INDEX `idx_customers_org_email` ON `customers` (`org_id`,`email`);--> statement-breakpoint
CREATE TABLE `invoice_line_items` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`invoice_id` text NOT NULL,
	`description` text NOT NULL,
	`quantity` real DEFAULT 1 NOT NULL,
	`unit` text DEFAULT 'ea',
	`unit_price` real NOT NULL,
	`total` real NOT NULL,
	`sort_order` integer DEFAULT 0,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_invoice_items_invoice` ON `invoice_line_items` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `idx_invoice_items_org` ON `invoice_line_items` (`org_id`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`number` text NOT NULL,
	`customer_id` text NOT NULL,
	`job_id` text,
	`quote_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`subtotal` real NOT NULL,
	`discount_amount` real DEFAULT 0,
	`tax_rate` real DEFAULT 0,
	`tax_amount` real DEFAULT 0,
	`total` real NOT NULL,
	`amount_paid` real DEFAULT 0,
	`balance_due` real,
	`currency` text DEFAULT 'USD',
	`due_date` integer,
	`issued_at` integer,
	`paid_at` integer,
	`last_payment_at` integer,
	`notes` text,
	`terms` text,
	`pdf_url` text,
	`stripe_invoice_id` text,
	`stripe_payment_intent_id` text,
	`sent_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_invoices_org_number` ON `invoices` (`org_id`,`number`);--> statement-breakpoint
CREATE INDEX `idx_invoices_org` ON `invoices` (`org_id`);--> statement-breakpoint
CREATE INDEX `idx_invoices_org_status` ON `invoices` (`org_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_invoices_customer` ON `invoices` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_invoices_job` ON `invoices` (`job_id`);--> statement-breakpoint
CREATE TABLE `job_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`job_id` text NOT NULL,
	`user_id` text,
	`activity_type` text NOT NULL,
	`description` text,
	`metadata` text DEFAULT '{}',
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_job_activities_job` ON `job_activities` (`job_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_job_activities_org` ON `job_activities` (`org_id`);--> statement-breakpoint
CREATE TABLE `job_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`job_id` text NOT NULL,
	`user_id` text,
	`url` text NOT NULL,
	`thumbnail_url` text,
	`caption` text,
	`taken_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_job_photos_job` ON `job_photos` (`job_id`);--> statement-breakpoint
CREATE INDEX `idx_job_photos_org` ON `job_photos` (`org_id`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`number` text NOT NULL,
	`customer_id` text NOT NULL,
	`lead_id` text,
	`quote_id` text,
	`invoice_id` text,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'new' NOT NULL,
	`priority` integer DEFAULT 0,
	`service_type` text,
	`scheduled_start` integer,
	`scheduled_end` integer,
	`actual_start` integer,
	`actual_end` integer,
	`assigned_techs` text DEFAULT '[]',
	`address_line1` text,
	`address_line2` text,
	`city` text,
	`state` text,
	`postal_code` text,
	`latitude` real,
	`longitude` real,
	`estimated_hours` real,
	`actual_hours` real,
	`notes` text,
	`internal_notes` text,
	`tags` text DEFAULT '[]',
	`custom_fields` text DEFAULT '{}',
	`completed_at` integer,
	`cancelled_at` integer,
	`cancel_reason` text,
	`deleted_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_jobs_org_number` ON `jobs` (`org_id`,`number`);--> statement-breakpoint
CREATE INDEX `idx_jobs_org` ON `jobs` (`org_id`);--> statement-breakpoint
CREATE INDEX `idx_jobs_org_status` ON `jobs` (`org_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_jobs_customer` ON `jobs` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_jobs_org_scheduled` ON `jobs` (`org_id`,`scheduled_start`);--> statement-breakpoint
CREATE TABLE `lead_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`lead_id` text NOT NULL,
	`user_id` text,
	`activity_type` text NOT NULL,
	`description` text,
	`metadata` text DEFAULT '{}',
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_lead_activities_lead` ON `lead_activities` (`lead_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_lead_activities_org` ON `lead_activities` (`org_id`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`customer_id` text,
	`contact_name` text,
	`contact_phone` text,
	`contact_email` text,
	`source` text DEFAULT 'phone_call' NOT NULL,
	`source_detail` text,
	`stage` text DEFAULT 'new' NOT NULL,
	`priority` integer DEFAULT 0,
	`title` text,
	`description` text,
	`service_type` text,
	`estimated_value` real,
	`assigned_to` text,
	`converted_to_job_id` text,
	`lost_reason` text,
	`tags` text DEFAULT '[]',
	`custom_fields` text DEFAULT '{}',
	`deal_size` real,
	`next_follow_up` integer,
	`ai_score` integer,
	`ai_score_breakdown` text DEFAULT 'null',
	`ai_analysis` text,
	`ai_category` text,
	`ai_actions` text DEFAULT 'null',
	`deleted_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_leads_org` ON `leads` (`org_id`);--> statement-breakpoint
CREATE INDEX `idx_leads_org_stage` ON `leads` (`org_id`,`stage`);--> statement-breakpoint
CREATE INDEX `idx_leads_assigned` ON `leads` (`assigned_to`);--> statement-breakpoint
CREATE INDEX `idx_leads_customer` ON `leads` (`customer_id`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`sender_id` text,
	`content` text NOT NULL,
	`content_html` text,
	`attachments` text DEFAULT '[]',
	`metadata` text DEFAULT '{}',
	`twilio_sid` text,
	`read_at` integer,
	`delivered_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_messages_conversation` ON `messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_messages_org` ON `messages` (`org_id`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`is_read` integer DEFAULT false,
	`action_url` text,
	`entity_type` text,
	`entity_id` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_user` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_notifications_org` ON `notifications` (`org_id`);--> statement-breakpoint
CREATE INDEX `idx_notifications_user_unread` ON `notifications` (`user_id`,`is_read`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`logo_url` text,
	`website` text,
	`phone` text,
	`email` text,
	`address_line1` text,
	`address_line2` text,
	`city` text,
	`state` text,
	`postal_code` text,
	`country` text DEFAULT 'US',
	`timezone` text DEFAULT 'UTC',
	`currency` text DEFAULT 'USD',
	`business_hours` text DEFAULT 'null',
	`settings` text DEFAULT '{}',
	`custom_fields` text DEFAULT '[]',
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_orgs_slug` ON `organizations` (`slug`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`invoice_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`amount` real NOT NULL,
	`method` text NOT NULL,
	`transaction_id` text,
	`receipt_url` text,
	`status` text DEFAULT 'completed' NOT NULL,
	`notes` text,
	`paid_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_payments_invoice` ON `payments` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_org` ON `payments` (`org_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_customer` ON `payments` (`customer_id`);--> statement-breakpoint
CREATE TABLE `quote_line_items` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`quote_id` text NOT NULL,
	`description` text NOT NULL,
	`quantity` real DEFAULT 1 NOT NULL,
	`unit` text DEFAULT 'ea',
	`unit_price` real NOT NULL,
	`total` real NOT NULL,
	`is_labor` integer DEFAULT false,
	`sort_order` integer DEFAULT 0,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_quote_items_quote` ON `quote_line_items` (`quote_id`);--> statement-breakpoint
CREATE INDEX `idx_quote_items_org` ON `quote_line_items` (`org_id`);--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`number` text NOT NULL,
	`lead_id` text,
	`customer_id` text NOT NULL,
	`job_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`subtotal` real NOT NULL,
	`discount_amount` real DEFAULT 0,
	`discount_percent` real DEFAULT 0,
	`tax_rate` real DEFAULT 0,
	`tax_amount` real DEFAULT 0,
	`total` real NOT NULL,
	`currency` text DEFAULT 'USD',
	`valid_until` integer,
	`terms` text,
	`pdf_url` text,
	`sent_at` integer,
	`viewed_at` integer,
	`accepted_at` integer,
	`declined_at` integer,
	`created_by` text NOT NULL,
	`deleted_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_quotes_org_number` ON `quotes` (`org_id`,`number`);--> statement-breakpoint
CREATE INDEX `idx_quotes_org` ON `quotes` (`org_id`);--> statement-breakpoint
CREATE INDEX `idx_quotes_org_status` ON `quotes` (`org_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_quotes_customer` ON `quotes` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_quotes_lead` ON `quotes` (`lead_id`);--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_refresh_tokens_user` ON `refresh_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_refresh_tokens_token` ON `refresh_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`job_id` text,
	`rating` integer NOT NULL,
	`title` text,
	`body` text,
	`response` text,
	`responded_at` integer,
	`source` text DEFAULT 'sitepilot',
	`external_url` text,
	`is_public` integer DEFAULT true,
	`is_featured` integer DEFAULT false,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_reviews_org` ON `reviews` (`org_id`);--> statement-breakpoint
CREATE INDEX `idx_reviews_customer` ON `reviews` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_reviews_job` ON `reviews` (`job_id`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`stripe_subscription_id` text,
	`stripe_customer_id` text,
	`plan_tier` text NOT NULL,
	`status` text DEFAULT 'incomplete' NOT NULL,
	`seats` integer DEFAULT 1 NOT NULL,
	`unit_price` real NOT NULL,
	`total_price` real NOT NULL,
	`currency` text DEFAULT 'USD',
	`billing_cycle` text DEFAULT 'monthly',
	`current_period_start` integer,
	`current_period_end` integer,
	`trial_ends_at` integer,
	`cancelled_at` integer,
	`cancel_at_period_end` integer DEFAULT false,
	`payment_method` text DEFAULT '{}',
	`metadata` text DEFAULT '{}',
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_stripe_subscription_id_unique` ON `subscriptions` (`stripe_subscription_id`);--> statement-breakpoint
CREATE INDEX `idx_subscriptions_org` ON `subscriptions` (`org_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_subscriptions_org_active` ON `subscriptions` (`org_id`);--> statement-breakpoint
CREATE TABLE `technicians` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`user_id` text,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text,
	`phone` text,
	`employee_id` text,
	`title` text,
	`skills` text DEFAULT '[]',
	`service_area` text DEFAULT '{}',
	`hourly_rate` real,
	`is_active` integer DEFAULT true,
	`color` text,
	`max_jobs_per_day` integer DEFAULT 8,
	`work_schedule` text DEFAULT '{}',
	`google_calendar_id` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_technicians_org` ON `technicians` (`org_id`);--> statement-breakpoint
CREATE INDEX `idx_technicians_user` ON `technicians` (`user_id`);--> statement-breakpoint
CREATE TABLE `usage_records` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`subscription_id` text,
	`metric` text NOT NULL,
	`quantity` real NOT NULL,
	`unit` text NOT NULL,
	`recorded_at` integer NOT NULL,
	`period_start` integer NOT NULL,
	`period_end` integer NOT NULL,
	`metadata` text DEFAULT '{}',
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_usage_org` ON `usage_records` (`org_id`);--> statement-breakpoint
CREATE INDEX `idx_usage_org_period` ON `usage_records` (`org_id`,`period_start`,`period_end`);--> statement-breakpoint
CREATE INDEX `idx_usage_subscription` ON `usage_records` (`subscription_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false,
	`password_hash` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`phone` text,
	`avatar_url` text,
	`role` text DEFAULT 'business_owner' NOT NULL,
	`permissions` text DEFAULT '[]',
	`is_active` integer DEFAULT true,
	`last_login_at` integer,
	`refresh_token` text,
	`refresh_token_expires_at` integer,
	`settings` text DEFAULT '{}',
	`deleted_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email_org` ON `users` (`org_id`,`email`);--> statement-breakpoint
CREATE INDEX `idx_users_org` ON `users` (`org_id`);--> statement-breakpoint
CREATE INDEX `idx_users_refresh_token` ON `users` (`refresh_token`);--> statement-breakpoint
CREATE TABLE `webhook_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`endpoint_id` text NOT NULL,
	`event` text NOT NULL,
	`payload` text DEFAULT '{}',
	`response_status` integer,
	`response_body` text,
	`attempt_count` integer DEFAULT 1,
	`status` text DEFAULT 'pending',
	`delivered_at` integer,
	`next_retry_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`endpoint_id`) REFERENCES `webhook_endpoints`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_webhook_deliveries_endpoint` ON `webhook_deliveries` (`endpoint_id`);--> statement-breakpoint
CREATE INDEX `idx_webhook_deliveries_org` ON `webhook_deliveries` (`org_id`);--> statement-breakpoint
CREATE INDEX `idx_webhook_deliveries_retry` ON `webhook_deliveries` (`status`,`next_retry_at`);--> statement-breakpoint
CREATE TABLE `webhook_endpoints` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`secret` text NOT NULL,
	`events` text DEFAULT '[]',
	`is_active` integer DEFAULT true,
	`last_sent_at` integer,
	`failure_count` integer DEFAULT 0,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_webhooks_org` ON `webhook_endpoints` (`org_id`);