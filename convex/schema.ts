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
      v.literal("approved")
    ),
    dismissReason: v.optional(v.string()),
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
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_name", ["name"])
    .index("by_website", ["website"]),

  analysis: defineTable({
    grantId: v.id("grants"),
    content: v.string(),
    alignmentScore: v.optional(v.number()),
    summary: v.optional(v.string()),
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
  }).index("by_token", ["tokenIdentifier"]),

  scraper_log: defineTable({
    source: v.string(),
    grantsFound: v.number(),
    grantsAdded: v.number(),
    error: v.optional(v.string()),
  })
    .index("by_source", ["source"]),
});
