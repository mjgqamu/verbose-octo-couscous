import { db, schema, eq, or, and, isNull, desc, sql } from "@sitepilot/db";
import { createLead } from "./leads";

const DEFAULT_TEMPLATE =
  "Hi, we noticed we missed your call. Sorry about that! " +
  "We'd love to help — feel free to call us back or reply here and we'll get right on it.";

export class MissedCallHandler {
  /**
   * Process a missed call: creates a call record, looks up the phone number
   * against existing leads/customers, and either attaches a follow-up message
   * to their latest conversation or creates a new high-priority lead.
   */
  async handleMissedCall(
    orgId: string,
    phoneNumber: string,
  ): Promise<{ leadId: string; callId: string; isNew: boolean }> {
    // 1. Create the missed-call record
    const [call] = await db
      .insert(schema.calls)
      .values({ orgId, fromNumber: phoneNumber, toNumber: "", direction: "inbound", status: "missed" })
      .returning();
    if (!call) throw new Error("Failed to create missed-call record");

    // 2. Search existing leads & customers by phone number
    const [existingLead] = await db
      .select()
      .from(schema.leads)
      .where(and(eq(schema.leads.orgId, orgId), eq(schema.leads.contactPhone, phoneNumber), isNull(schema.leads.deletedAt)))
      .orderBy(desc(schema.leads.createdAt))
      .limit(1);

    const [existingCustomer] = await db
      .select()
      .from(schema.customers)
      .where(and(eq(schema.customers.orgId, orgId), or(eq(schema.customers.phone, phoneNumber), eq(schema.customers.phoneAlt, phoneNumber)), isNull(schema.customers.deletedAt)))
      .limit(1);

    // 3. Found an existing lead or customer → attach follow-up message
    if (existingLead || existingCustomer) {
      return this._attachToExisting(orgId, phoneNumber, call, existingLead ?? null, existingCustomer ?? null);
    }

    // 4. No match → create a new lead with high priority
    return this._createNewLead(orgId, phoneNumber, call);
  }

  /** Return the org's missed-call message template, or the default. */
  async getMessageTemplate(orgId: string): Promise<string> {
    const [config] = await db
      .select()
      .from(schema.aiConfigurations)
      .where(and(eq(schema.aiConfigurations.orgId, orgId), eq(schema.aiConfigurations.configType, "missed_call")))
      .limit(1);
    return config?.systemPrompt ?? DEFAULT_TEMPLATE;
  }

  // ── private helpers ────────────────────────────────────────────────────

  private async _attachToExisting(
    orgId: string,
    phoneNumber: string,
    call: typeof schema.calls.$inferSelect,
    lead: typeof schema.leads.$inferSelect | null,
    customer: typeof schema.customers.$inferSelect | null,
  ): Promise<{ leadId: string; callId: string; isNew: boolean }> {
    const template = await this.getMessageTemplate(orgId);
    const conversation = await this._findOrCreateConversation(orgId, lead, customer, "Missed Call Follow-up");

    await db.insert(schema.messages).values({
      orgId, conversationId: conversation.id, role: "system", content: template,
      metadata: { type: "missed_call", callId: call.id, fromNumber: phoneNumber },
    });

    await db
      .update(schema.conversations)
      .set({ lastMessageAt: new Date(), messageCount: sql`${schema.conversations.messageCount} + 1` })
      .where(eq(schema.conversations.id, conversation.id));

    // Resolve leadId: prefer the lead we found, otherwise look up / create one for the customer
    let leadId = lead?.id;
    if (!leadId && customer) {
      const [cl] = await db
        .select({ id: schema.leads.id })
        .from(schema.leads)
        .where(and(eq(schema.leads.orgId, orgId), eq(schema.leads.customerId, customer.id), isNull(schema.leads.deletedAt)))
        .orderBy(desc(schema.leads.createdAt))
        .limit(1);
      leadId = cl?.id;
    }
    if (!leadId && customer) {
      const newLead = await createLead({
        orgId, customerId: customer.id,
        contactName: [customer.firstName, customer.lastName].filter(Boolean).join(" ") || undefined,
        contactPhone: phoneNumber, contactEmail: customer.email ?? undefined,
        source: "phone", sourceDetail: "missed_call", stage: "new", priority: 3,
        title: "Missed Call", description: `Missed call from ${phoneNumber} (existing customer)`,
      });
      leadId = newLead?.id;
    }

    await db
      .update(schema.calls)
      .set({ leadId: leadId ?? null, customerId: customer?.id ?? null, conversationId: conversation.id })
      .where(eq(schema.calls.id, call.id));

    if (!leadId) throw new Error("Could not resolve a leadId for missed call");
    return { leadId, callId: call.id, isNew: false };
  }

  private async _createNewLead(
    orgId: string,
    phoneNumber: string,
    call: typeof schema.calls.$inferSelect,
  ): Promise<{ leadId: string; callId: string; isNew: boolean }> {
    const template = await this.getMessageTemplate(orgId);

    const lead = await createLead({
      orgId, contactPhone: phoneNumber,
      source: "phone", sourceDetail: "missed_call", stage: "new", priority: 3,
      title: "Missed Call", description: `Missed call from ${phoneNumber}`,
    });
    if (!lead) throw new Error("Failed to create lead for missed call");

    const [conv] = await db
      .insert(schema.conversations)
      .values({ orgId, leadId: lead.id, channel: "phone", subject: "Missed Call Follow-up" })
      .returning();

    if (conv) {
      await db.insert(schema.messages).values({
        orgId, conversationId: conv.id, role: "system", content: template,
        metadata: { type: "missed_call", callId: call.id, fromNumber: phoneNumber },
      });
      await db
        .update(schema.conversations)
        .set({ lastMessageAt: new Date(), messageCount: 1 })
        .where(eq(schema.conversations.id, conv.id));
    }

    await db
      .update(schema.calls)
      .set({ leadId: lead.id, conversationId: conv?.id ?? null })
      .where(eq(schema.calls.id, call.id));

    return { leadId: lead.id, callId: call.id, isNew: true };
  }

  private async _findOrCreateConversation(
    orgId: string,
    lead: typeof schema.leads.$inferSelect | null,
    customer: typeof schema.customers.$inferSelect | null,
    subject: string,
  ) {
    const conditions: ReturnType<typeof and>[] = [eq(schema.conversations.orgId, orgId)];
    if (lead) conditions.push(eq(schema.conversations.leadId, lead.id));
    else if (customer) conditions.push(eq(schema.conversations.customerId, customer.id));
    else throw new Error("Either lead or customer must be provided");

    const [existing] = await db
      .select().from(schema.conversations)
      .where(and(...conditions))
      .orderBy(desc(schema.conversations.lastMessageAt))
      .limit(1);
    if (existing) return existing;

    const [conv] = await db
      .insert(schema.conversations)
      .values({ orgId, leadId: lead?.id ?? null, customerId: customer?.id ?? null, channel: "phone", subject })
      .returning();
    if (!conv) throw new Error("Failed to create conversation");
    return conv;
  }
}

export const missedCallHandler = new MissedCallHandler();
