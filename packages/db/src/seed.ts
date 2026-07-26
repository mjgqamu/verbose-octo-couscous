import { db } from "./db";
import * as schema from "./schema/index";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");

  // 1. Create Demo Org
  const [org] = await db
    .insert(schema.organizations)
    .values({
      name: "Demo Plumbing Co",
      slug: "demo-plumbing-co",
      phone: "+1-555-0100",
      email: "info@demoplumbingco.com",
      addressLine1: "123 Main Street",
      city: "Austin",
      state: "TX",
      postalCode: "78701",
      country: "US",
      timezone: "America/Chicago",
      currency: "USD",
      businessHours: {
        mon: { open: "08:00", close: "17:00" },
        tue: { open: "08:00", close: "17:00" },
        wed: { open: "08:00", close: "17:00" },
        thu: { open: "08:00", close: "17:00" },
        fri: { open: "08:00", close: "17:00" },
      },
      settings: { features: { aiReceptionist: true, jobManagement: true, invoicing: true } },
    })
    .returning();
  console.log(`  ✅ Organization: ${org.name} (${org.id})`);

  // 2. Create Owner User
  const [owner] = await db
    .insert(schema.users)
    .values({
      orgId: org.id,
      email: "owner@demoplumbingco.com",
      passwordHash: "$2b$12$LJ3m4ys3GZfnYMz8kVSqZOqkHvQEfVLTCHEgGtMPH7pYqX9nNuBCu", // "password123"
      firstName: "Mike",
      lastName: "Johnson",
      phone: "+1-555-0101",
      role: "business_owner",
      isActive: true,
      emailVerified: true,
    })
    .returning();
  console.log(`  ✅ Owner: ${owner.firstName} ${owner.lastName} (${owner.id})`);

  // 3. Create Office Admin
  const [admin] = await db
    .insert(schema.users)
    .values({
      orgId: org.id,
      email: "admin@demoplumbingco.com",
      passwordHash: "$2b$12$LJ3m4ys3GZfnYMz8kVSqZOqkHvQEfVLTCHEgGtMPH7pYqX9nNuBCu",
      firstName: "Sarah",
      lastName: "Chen",
      phone: "+1-555-0102",
      role: "office_admin",
      isActive: true,
      emailVerified: true,
    })
    .returning();
  console.log(`  ✅ Admin: ${admin.firstName} ${admin.lastName} (${admin.id})`);

  // 4. Create Technician
  const [tech] = await db
    .insert(schema.technicians)
    .values({
      orgId: org.id,
      firstName: "Carlos",
      lastName: "Rodriguez",
      email: "carlos@demoplumbingco.com",
      phone: "+1-555-0103",
      employeeId: "TECH-001",
      title: "Senior Plumber",
      skills: ["plumbing", "drain_cleaning", "water_heater", "emergency"],
      hourlyRate: "45.00",
      isActive: true,
      color: "#4F46E5",
      maxJobsPerDay: 6,
      workSchedule: {
        mon: { start: "08:00", end: "17:00" },
        tue: { start: "08:00", end: "17:00" },
        wed: { start: "08:00", end: "17:00" },
        thu: { start: "08:00", end: "17:00" },
        fri: { start: "08:00", end: "17:00" },
      },
    })
    .returning();
  console.log(`  ✅ Technician: ${tech.firstName} ${tech.lastName} (${tech.id})`);

  // 5. Create 5 Customers
  const [cust1] = await db
    .insert(schema.customers)
    .values({
      orgId: org.id,
      firstName: "Alice",
      lastName: "Williams",
      email: "alice.williams@email.com",
      phone: "+1-555-0201",
      addressLine1: "456 Oak Avenue",
      city: "Austin",
      state: "TX",
      postalCode: "78702",
      country: "US",
      tags: ["residential", "repeat"],
      notes: "Prefers morning appointments. Has two bathrooms.",
      lifetimeValue: "3800.00",
      totalJobs: 3,
      lastJobAt: new Date("2026-06-15"),
    })
    .returning();

  const [cust2] = await db
    .insert(schema.customers)
    .values({
      orgId: org.id,
      firstName: "Bob",
      lastName: "Martinez",
      company: "Martinez Property Management",
      email: "bob@martinezpm.com",
      phone: "+1-555-0202",
      addressLine1: "789 Pine Street, Suite 100",
      city: "Austin",
      state: "TX",
      postalCode: "78703",
      country: "US",
      tags: ["commercial", "vip", "property_manager"],
      notes: "Manages 12 properties. Prefers consolidated billing.",
      lifetimeValue: "24600.00",
      totalJobs: 14,
      lastJobAt: new Date("2026-06-28"),
    })
    .returning();

  const [cust3] = await db
    .insert(schema.customers)
    .values({
      orgId: org.id,
      firstName: "Jennifer",
      lastName: "Taylor",
      email: "j.taylor@email.com",
      phone: "+1-555-0203",
      addressLine1: "1200 West Elm Street",
      city: "Austin",
      state: "TX",
      postalCode: "78704",
      country: "US",
      tags: ["residential"],
      lifetimeValue: "1200.00",
      totalJobs: 1,
      lastJobAt: new Date("2026-05-20"),
    })
    .returning();

  const [cust4] = await db
    .insert(schema.customers)
    .values({
      orgId: org.id,
      firstName: "David",
      lastName: "Kim",
      company: "Kim's Restaurant Group",
      email: "david@kimsrestaurants.com",
      phone: "+1-555-0204",
      addressLine1: "45 Commerce Blvd",
      city: "Round Rock",
      state: "TX",
      postalCode: "78664",
      country: "US",
      tags: ["commercial", "restaurant"],
      notes: "Three restaurant locations. Emergency service priority.",
      lifetimeValue: "8900.00",
      totalJobs: 6,
      lastJobAt: new Date("2026-07-01"),
    })
    .returning();

  const [cust5] = await db
    .insert(schema.customers)
    .values({
      orgId: org.id,
      firstName: "Maria",
      lastName: "Garcia",
      email: "maria.g@email.com",
      phone: "+1-555-0205",
      phoneAlt: "+1-555-0206",
      addressLine1: "78 River Road",
      city: "Austin",
      state: "TX",
      postalCode: "78701",
      country: "US",
      source: "referral",
      tags: ["residential", "new"],
      notes: "Referred by Alice Williams.",
    })
    .returning();
  console.log(`  ✅ 5 Customers created`);

  // 6. Create 10 Leads across different stages
  const leadData = [
    {
      orgId: org.id,
      customerId: cust1.id,
      contactName: "Alice Williams",
      contactPhone: "+1-555-0201",
      contactEmail: "alice.williams@email.com",
      source: "phone_call",
      sourceDetail: "Called about water heater issue",
      stage: "new",
      priority: 2,
      title: "Water Heater Not Producing Hot Water",
      description: "Customer reports water heater is 8 years old and stopped producing hot water yesterday. Tank is leaking slightly from the bottom.",
      serviceType: "water_heater_repair",
      estimatedValue: "1200.00",
      assignedTo: admin.id,
      tags: ["emergency", "water_heater"],
      createdAt: new Date("2026-07-17T08:30:00Z"),
    },
    {
      orgId: org.id,
      contactName: "Diana Park",
      contactPhone: "+1-555-0301",
      contactEmail: "diana.park@email.com",
      source: "website_form",
      sourceDetail: "Contact form - bathroom renovation",
      stage: "contacted",
      priority: 1,
      title: "Bathroom Renovation Quote Request",
      description: "Looking to renovate master bathroom. Wants new tile, vanity, and walk-in shower. Budget: $15-20k.",
      serviceType: "bathroom_renovation",
      estimatedValue: "18000.00",
      assignedTo: admin.id,
      createdAt: new Date("2026-07-16T14:15:00Z"),
    },
    {
      orgId: org.id,
      customerId: cust2.id,
      contactName: "Bob Martinez",
      contactPhone: "+1-555-0202",
      contactEmail: "bob@martinezpm.com",
      source: "repeat_customer",
      sourceDetail: "Quarterly maintenance check request",
      stage: "qualified",
      priority: 0,
      title: "Quarterly Plumbing Maintenance - 12 Properties",
      description: "Regular quarterly inspection and maintenance across all 12 managed properties.",
      serviceType: "maintenance",
      estimatedValue: "4800.00",
      assignedTo: owner.id,
      tags: ["commercial", "recurring"],
      createdAt: new Date("2026-07-15T10:00:00Z"),
    },
    {
      orgId: org.id,
      contactName: "James Wilson",
      contactPhone: "+1-555-0302",
      contactEmail: "jwilson@email.com",
      source: "google_business",
      sourceDetail: "Found on Google Maps",
      stage: "quote_sent",
      priority: 1,
      title: "Kitchen Sink Replacement & Garbage Disposal Install",
      description: "Kitchen sink is cracked and needs replacement. Also wants new garbage disposal installed.",
      serviceType: "kitchen_plumbing",
      estimatedValue: "850.00",
      assignedTo: admin.id,
      createdAt: new Date("2026-07-14T09:45:00Z"),
    },
    {
      orgId: org.id,
      contactName: "Sarah Mitchell",
      contactPhone: "+1-555-0303",
      contactEmail: "s.mitchell@email.com",
      source: "website_chat",
      sourceDetail: "Chatbot conversation on website",
      stage: "approved",
      priority: 0,
      title: "Water Softener Installation",
      description: "Looking to install a whole-house water softener system. Already got quote and approved.",
      serviceType: "water_softener",
      estimatedValue: "3200.00",
      assignedTo: owner.id,
      dealSize: "3200.00",
      createdAt: new Date("2026-07-13T11:20:00Z"),
    },
    {
      orgId: org.id,
      customerId: cust4.id,
      contactName: "David Kim",
      contactPhone: "+1-555-0204",
      contactEmail: "david@kimsrestaurants.com",
      source: "repeat_customer",
      sourceDetail: "Emergency call - grease trap",
      stage: "job_scheduled",
      priority: 2,
      title: "Grease Trap Cleaning - Location 2",
      description: "Grease trap at downtown location is overflowing. Needs emergency service.",
      serviceType: "commercial_plumbing",
      estimatedValue: "650.00",
      assignedTo: admin.id,
      tags: ["emergency", "commercial"],
      createdAt: new Date("2026-07-12T07:00:00Z"),
    },
    {
      orgId: org.id,
      customerId: cust3.id,
      contactName: "Jennifer Taylor",
      contactPhone: "+1-555-0203",
      contactEmail: "j.taylor@email.com",
      source: "referral",
      sourceDetail: "Referred by neighbor",
      stage: "completed",
      priority: 0,
      title: "Toilet Replacement - Master Bath",
      description: "Replaced old toilet with new water-efficient model.",
      serviceType: "plumbing_repair",
      estimatedValue: "450.00",
      assignedTo: admin.id,
      createdAt: new Date("2026-07-10T13:30:00Z"),
    },
    {
      orgId: org.id,
      contactName: "Tom Henderson",
      contactPhone: "+1-555-0304",
      contactEmail: "tomh@email.com",
      source: "phone_call",
      sourceDetail: "Called about HVAC issue - redirected",
      stage: "lost",
      priority: 0,
      title: "HVAC Duct Cleaning",
      description: "Looking for HVAC duct cleaning. We don't offer this service - referred to HVAC partner.",
      serviceType: "hvac",
      estimatedValue: "600.00",
      assignedTo: admin.id,
      lostReason: "Service not offered — referred to partner",
      createdAt: new Date("2026-07-09T15:45:00Z"),
    },
    {
      orgId: org.id,
      customerId: cust5.id,
      contactName: "Maria Garcia",
      contactPhone: "+1-555-0205",
      contactEmail: "maria.g@email.com",
      source: "referral",
      sourceDetail: "Referred by Alice Williams",
      stage: "new",
      priority: 1,
      title: "Outdoor Faucet Repair & Sprinkler Hookup",
      description: "Outdoor faucet is leaking and needs repair. Also wants to hook up sprinkler system to main water line.",
      serviceType: "outdoor_plumbing",
      estimatedValue: "750.00",
      assignedTo: admin.id,
      createdAt: new Date("2026-07-17T09:00:00Z"),
    },
    {
      orgId: org.id,
      contactName: "Rachel Green",
      contactPhone: "+1-555-0305",
      contactEmail: "rachel.g@email.com",
      source: "facebook",
      sourceDetail: "Facebook Marketplace inquiry",
      stage: "contacted",
      priority: 1,
      title: "Gas Line Installation for New Stove",
      description: "Converting from electric to gas stove. Needs gas line run from main to kitchen. Has permits ready.",
      serviceType: "gas_plumbing",
      estimatedValue: "2200.00",
      assignedTo: owner.id,
      createdAt: new Date("2026-07-16T16:00:00Z"),
    },
  ];

  const createdLeads = [];
  for (const ld of leadData) {
    const [lead] = await db.insert(schema.leads).values(ld).returning();
    if (lead) createdLeads.push(lead);
  }
  console.log(`  ✅ ${createdLeads.length} Leads created`);

  // 7. Create lead activities (2-3 per lead)
  const activityValues = [
    { leadId: createdLeads[0]!.id, userId: admin.id, activityType: "note", description: "Customer called in urgent. Water heater leaking - needs immediate attention.", createdAt: new Date("2026-07-17T08:35:00Z") },
    { leadId: createdLeads[0]!.id, userId: admin.id, activityType: "call", description: "Called customer back — confirmed appointment for this afternoon.", createdAt: new Date("2026-07-17T09:00:00Z") },
    { leadId: createdLeads[1]!.id, userId: admin.id, activityType: "email", description: "Sent initial response email with portfolio and bathroom renovation brochure.", createdAt: new Date("2026-07-16T14:20:00Z") },
    { leadId: createdLeads[1]!.id, userId: admin.id, activityType: "note", description: "Diana has excellent budget range. High priority follow-up needed.", createdAt: new Date("2026-07-16T15:00:00Z") },
    { leadId: createdLeads[2]!.id, userId: owner.id, activityType: "call", description: "Discussed quarterly maintenance schedule with Bob. Agreed to send updated quote.", createdAt: new Date("2026-07-15T10:30:00Z") },
    { leadId: createdLeads[3]!.id, userId: admin.id, activityType: "email", description: "Quote sent via email — $850 for sink replacement + disposal install.", createdAt: new Date("2026-07-14T10:00:00Z") },
    { leadId: createdLeads[3]!.id, userId: admin.id, activityType: "stage_change", description: "Stage changed to quote_sent", createdAt: new Date("2026-07-14T10:05:00Z") },
    { leadId: createdLeads[4]!.id, userId: owner.id, activityType: "note", description: "Customer approved quote. Scheduling installation for next week.", createdAt: new Date("2026-07-13T14:00:00Z") },
    { leadId: createdLeads[4]!.id, userId: owner.id, activityType: "stage_change", description: "Stage changed to approved", createdAt: new Date("2026-07-13T14:01:00Z") },
    { leadId: createdLeads[5]!.id, userId: admin.id, activityType: "call", description: "Emergency call — dispatched Carlos for same-day service.", createdAt: new Date("2026-07-12T07:15:00Z") },
    { leadId: createdLeads[5]!.id, userId: admin.id, activityType: "stage_change", description: "Stage changed to job_scheduled", createdAt: new Date("2026-07-12T07:20:00Z") },
    { leadId: createdLeads[6]!.id, userId: admin.id, activityType: "note", description: "Job completed successfully. Customer very satisfied — left 5-star review.", createdAt: new Date("2026-07-11T09:00:00Z") },
    { leadId: createdLeads[6]!.id, userId: admin.id, activityType: "stage_change", description: "Stage changed to completed", createdAt: new Date("2026-07-11T09:01:00Z") },
    { leadId: createdLeads[7]!.id, userId: admin.id, activityType: "note", description: "Referred to HVAC partner. Sent follow-up email with referral contact info.", createdAt: new Date("2026-07-09T16:00:00Z") },
    { leadId: createdLeads[7]!.id, userId: admin.id, activityType: "stage_change", description: "Stage changed to lost", createdAt: new Date("2026-07-09T16:05:00Z") },
    { leadId: createdLeads[8]!.id, userId: admin.id, activityType: "note", description: "New lead from Alice's referral. Maria sounds like a great customer.", createdAt: new Date("2026-07-17T09:05:00Z") },
    { leadId: createdLeads[9]!.id, userId: owner.id, activityType: "note", description: "Interesting gas line job. Need to verify permits before quoting.", createdAt: new Date("2026-07-16T16:10:00Z") },
    { leadId: createdLeads[9]!.id, userId: owner.id, activityType: "email", description: "Replied to Facebook message — requested details about permit status.", createdAt: new Date("2026-07-16T16:15:00Z") },
  ];

  for (const av of activityValues) {
    await db.insert(schema.leadActivities).values({
      orgId: org.id,
      leadId: av.leadId,
      userId: av.userId,
      activityType: av.activityType,
      description: av.description,
      createdAt: av.createdAt,
    });
  }
  console.log(`  ✅ ${activityValues.length} Lead activities created`);

  // 8. Create 3 Conversations with messages
  const [conv1] = await db
    .insert(schema.conversations)
    .values({
      orgId: org.id,
      customerId: cust1.id,
      leadId: createdLeads[0]!.id,
      channel: "voice",
      subject: "Water heater emergency call",
      status: "active",
      isAiHandled: false,
      lastMessageAt: new Date("2026-07-17T08:35:00Z"),
      messageCount: 2,
    })
    .returning();

  const [conv2] = await db
    .insert(schema.conversations)
    .values({
      orgId: org.id,
      leadId: createdLeads[4]!.id,
      channel: "chat",
      subject: "Water softener installation inquiry",
      status: "active",
      isAiHandled: true,
      aiEscalated: false,
      lastMessageAt: new Date("2026-07-13T11:30:00Z"),
      messageCount: 6,
    })
    .returning();

  const [conv3] = await db
    .insert(schema.conversations)
    .values({
      orgId: org.id,
      customerId: cust2.id,
      leadId: createdLeads[2]!.id,
      channel: "email",
      subject: "Quarterly maintenance scheduling",
      status: "active",
      isAiHandled: false,
      lastMessageAt: new Date("2026-07-15T10:30:00Z"),
      messageCount: 3,
    })
    .returning();
  console.log(`  ✅ 3 Conversations created`);

  // 9. Create messages for conversations
  if (conv1) {
    await db.insert(schema.messages).values([
      { orgId: org.id, conversationId: conv1.id, role: "human", senderId: admin.id, content: "Hi Alice, I understand your water heater is leaking. Can you confirm the make and model?", createdAt: new Date("2026-07-17T08:32:00Z") },
      { orgId: org.id, conversationId: conv1.id, role: "human", senderId: owner.id, content: "No worries — we're sending Carlos out this afternoon. He'll be there by 2pm.", createdAt: new Date("2026-07-17T08:35:00Z") },
    ]);
  }
  if (conv2) {
    await db.insert(schema.messages).values([
      { orgId: org.id, conversationId: conv2.id, role: "ai", content: "Hi! I see you're interested in a water softener installation. I'd be happy to help. What size home do you have?", createdAt: new Date("2026-07-13T11:21:00Z") },
      { orgId: org.id, conversationId: conv2.id, role: "human", content: "It's a 4-bedroom, 3-bath home, about 2,800 sq ft.", createdAt: new Date("2026-07-13T11:22:00Z") },
      { orgId: org.id, conversationId: conv2.id, role: "ai", content: "Great, for a home that size I'd recommend our whole-house system. The installed price is around $3,200. Would you like me to have someone call you to schedule a site visit?", createdAt: new Date("2026-07-13T11:23:00Z") },
      { orgId: org.id, conversationId: conv2.id, role: "human", content: "Yes please, that would be great.", createdAt: new Date("2026-07-13T11:24:00Z") },
      { orgId: org.id, conversationId: conv2.id, role: "ai", content: "Perfect! I've noted your details. Sarah from our office will call you within the hour to schedule. Thanks for choosing Demo Plumbing Co!", createdAt: new Date("2026-07-13T11:25:00Z") },
      { orgId: org.id, conversationId: conv2.id, role: "human", senderId: admin.id, content: "Hi Sarah Mitchell — I'm calling to schedule your water softener installation. How does next Tuesday at 10am sound?", createdAt: new Date("2026-07-13T11:30:00Z") },
    ]);
  }
  if (conv3) {
    await db.insert(schema.messages).values([
      { orgId: org.id, conversationId: conv3.id, role: "human", senderId: owner.id, content: "Hi Bob, just a reminder that your quarterly maintenance is due next week. Shall we schedule all 12 properties?", createdAt: new Date("2026-07-15T10:00:00Z") },
      { orgId: org.id, conversationId: conv3.id, role: "human", content: "Yes Mike, let's do it. Can we split across Mon-Wed next week? I'll send updated property access list.", createdAt: new Date("2026-07-15T10:15:00Z") },
      { orgId: org.id, conversationId: conv3.id, role: "human", senderId: owner.id, content: "Sounds good. I'll have Sarah coordinate the schedule and send you confirmation by Friday.", createdAt: new Date("2026-07-15T10:30:00Z") },
    ]);
  }
  console.log(`  ✅ Messages created`);

  // 10. Create 2 Calls logged as activities
  await db.insert(schema.calls).values([
    {
      orgId: org.id,
      leadId: createdLeads[0]!.id,
      customerId: cust1.id,
      fromNumber: "+1-555-0201",
      toNumber: "+1-555-0100",
      direction: "inbound",
      status: "completed",
      duration: 320,
      summary: "Customer called about leaking water heater. AI receptionist captured details and routed to admin.",
      sentiment: "urgent",
      intent: "emergency_repair",
      aiHandled: true,
      startedAt: new Date("2026-07-17T08:28:00Z"),
      endedAt: new Date("2026-07-17T08:33:00Z"),
    },
    {
      orgId: org.id,
      leadId: createdLeads[2]!.id,
      customerId: cust2.id,
      fromNumber: "+1-555-0100",
      toNumber: "+1-555-0202",
      direction: "outbound",
      status: "completed",
      duration: 540,
      summary: "Owner called Bob to discuss quarterly maintenance schedule. Agreed on next week Mon-Wed split.",
      sentiment: "positive",
      intent: "scheduling",
      aiHandled: false,
      startedAt: new Date("2026-07-15T10:05:00Z"),
      endedAt: new Date("2026-07-15T10:14:00Z"),
    },
  ]);
  console.log("  ✅ 2 Calls created");

  console.log("\n🎉 Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
