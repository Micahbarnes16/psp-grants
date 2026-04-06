import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  grants: defineTable({
    title: v.string(),
    funderName: v.string(),
    funderId: v.optional(v.id("funders")),
    amount: v.optional(v.number()),
    deadline: v.optional(v.number()),
    status: v.union(
      v.literal("inbox"),
      v.literal("active"),
      v.literal("renewal"),
      v.literal("pipeline"),
      v.literal("history")
    ),
    description: v.optional(v.string()),
    url: v.optional(v.string()),
    notes: v.optional(v.string()),
    tokenIdentifier: v.string(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_token_and_status", ["tokenIdentifier", "status"]),

  funders: defineTable({
    name: v.string(),
    website: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    notes: v.optional(v.string()),
    tokenIdentifier: v.string(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_name", ["name"]),

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
});
