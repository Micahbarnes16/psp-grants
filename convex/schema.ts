import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const acceptsUnsolicitedValidator = v.optional(
  v.union(v.literal("yes"), v.literal("no"), v.literal("unknown"))
);

export default defineSchema({
  grants: defineTable({
    title: v.string(),
    funderName: v.string(),
    funderId: v.optional(v.id("funders")),
    // Manual entry fields
    amount: v.optional(v.number()),
    description: v.optional(v.string()),
    url: v.optional(v.string()),
    notes: v.optional(v.string()),
    // tokenIdentifier is optional so system-scraped grants (no user) are valid
    tokenIdentifier: v.optional(v.string()),
    // Scraper-populated fields
    sourceUrl: v.optional(v.string()),
    funderUrl: v.optional(v.string()),
    deadline: v.optional(v.number()),
    amountMin: v.optional(v.number()),
    amountMax: v.optional(v.number()),
    isRecurring: v.optional(v.boolean()),
    acceptsUnsolicited: acceptsUnsolicitedValidator,
    requiresLoi: v.optional(v.boolean()),
    rawText: v.optional(v.string()),
    discoveredAt: v.optional(v.number()),
    status: v.union(
      v.literal("inbox"),
      v.literal("active"),
      v.literal("renewal"),
      v.literal("pipeline"),
      v.literal("history"),
      v.literal("pending_analysis"),
      v.literal("under_review"),
      v.literal("dismissed"),
      v.literal("approved"),
      v.literal("submitted"),
      v.literal("accepted"),
      v.literal("rejected")
    ),
    dismissReason: v.optional(v.string()),
    // Award / decision fields
    awardAmount: v.optional(v.number()),
    decisionDate: v.optional(v.number()),
    decisionNotes: v.optional(v.string()),
    submittedAt: v.optional(v.number()),
    // Grant period and renewal tracking
    grantPeriodStart: v.optional(v.number()),
    grantPeriodEnd: v.optional(v.number()),
    reapplyReminderDate: v.optional(v.number()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_token_and_status", ["tokenIdentifier", "status"])
    .index("by_source_url", ["sourceUrl"])
    .index("by_status", ["status"]),

  funders: defineTable({
    name: v.string(),
    website: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    notes: v.optional(v.string()),
    tokenIdentifier: v.optional(v.string()),
    // Scraper-populated fields
    faithAligned: v.optional(v.boolean()),
    acceptsUnsolicited: acceptsUnsolicitedValidator,
    requiresInvitation: v.optional(v.boolean()),
    monitorForReopening: v.optional(v.boolean()),
    lastScrapedAt: v.optional(v.number()),
    suspended: v.optional(v.boolean()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_name", ["name"])
    .index("by_website", ["website"]),

  analysis: defineTable({
    grantId: v.id("grants"),
    content: v.string(),
    alignmentScore: v.optional(v.number()),
    summary: v.optional(v.string()),
    pros: v.optional(v.array(v.string())),
    cons: v.optional(v.array(v.string())),
    recommendedFundingNeed: v.optional(v.string()),
    suggestedApproach: v.optional(v.string()),
    draftContent: v.optional(v.string()),
    tokenIdentifier: v.string(),
  })
    .index("by_grant", ["grantId"])
    .index("by_token", ["tokenIdentifier"]),

  applications: defineTable({
    grantId: v.id("grants"),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("awarded"),
      v.literal("declined")
    ),
    submittedAt: v.optional(v.number()),
    amount: v.optional(v.number()),
    notes: v.optional(v.string()),
    tokenIdentifier: v.string(),
  })
    .index("by_grant", ["grantId"])
    .index("by_token", ["tokenIdentifier"])
    .index("by_token_and_status", ["tokenIdentifier", "status"]),

  decisions: defineTable({
    applicationId: v.id("applications"),
    decision: v.union(
      v.literal("awarded"),
      v.literal("declined"),
      v.literal("pending")
    ),
    amount: v.optional(v.number()),
    notes: v.optional(v.string()),
    decisionDate: v.optional(v.number()),
    tokenIdentifier: v.string(),
  })
    .index("by_application", ["applicationId"])
    .index("by_token", ["tokenIdentifier"]),

  psp_profile: defineTable({
    name: v.string(),
    mission: v.string(),
    ein: v.optional(v.string()),
    website: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    focusAreas: v.array(v.string()),
    tokenIdentifier: v.string(),
    // Extended org profile
    primaryPrograms: v.optional(v.string()),
    geographicScope: v.optional(v.string()),
    annualBudget: v.optional(v.string()),
    foundedYear: v.optional(v.number()),
    // Notification preferences
    notifyNewGrants: v.optional(v.boolean()),
    notifyEmail: v.optional(v.string()),
    notifyMinScore: v.optional(v.number()),
  }).index("by_token", ["tokenIdentifier"]),

  scraper_log: defineTable({
    source: v.string(),
    grantsFound: v.number(),
    grantsAdded: v.number(),
    error: v.optional(v.string()),
  })
    .index("by_source", ["source"]),

  leaders: defineTable({
    externalId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    fullName: v.string(),
    state: v.string(),
    chamber: v.string(),
    district: v.optional(v.string()),
    party: v.optional(v.string()),
    title: v.optional(v.string()),
    office: v.optional(v.string()),
    source: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    birthday: v.optional(v.string()),
    birthplace: v.optional(v.string()),
    spouse: v.optional(v.string()),
    children: v.optional(v.string()),
    bio: v.optional(v.string()),
    level: v.string(),
    branch: v.string(),
    inOffice: v.boolean(),
    lastSyncedAt: v.number(),
    lastVerifiedAt: v.optional(v.number()),
    firestoreDocId: v.optional(v.string()),
  })
    .index("by_state", ["state"])
    .index("by_external_id", ["externalId"])
    .index("by_branch", ["branch"])
    .index("by_state_and_chamber", ["state", "chamber"])
    .index("by_state_and_branch", ["state", "branch"])
    .searchIndex("search_name", {
      searchField: "fullName",
      filterFields: ["state"],
    })
    .searchIndex("search_by_name", {
      searchField: "fullName",
      filterFields: ["state", "branch", "chamber"],
    }),

  leader_changes: defineTable({
    leaderId: v.id("leaders"),
    field: v.string(),
    oldValue: v.optional(v.string()),
    newValue: v.string(),
    source: v.string(),
    sourceUrl: v.optional(v.string()),
    confidence: v.string(),
    status: v.string(),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.string()),
    detectedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_leader", ["leaderId"])
    .index("by_leader_and_status", ["leaderId", "status"]),
});
