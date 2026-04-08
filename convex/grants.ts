import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { requireAllowedUser } from "./lib/auth";

// ---------------------------------------------------------------------------
// Inbox list — pending_analysis + under_review, sorted deadline-asc
// ---------------------------------------------------------------------------
export const listInbox = query({
  args: {},
  handler: async (ctx) => {
    await requireAllowedUser(ctx);

    const pending = await ctx.db
      .query("grants")
      .withIndex("by_status", (q) => q.eq("status", "pending_analysis"))
      .take(200);

    const underReview = await ctx.db
      .query("grants")
      .withIndex("by_status", (q) => q.eq("status", "under_review"))
      .take(200);

    // Catch legacy records inserted before `status` was enforced by the schema.
    // Index scans can't match undefined, so we do a full scan filtered in JS.
    const allGrants = await ctx.db.query("grants").collect();
    const noStatus = allGrants.filter(
      (g) => (g as { status?: string }).status === undefined
    );

    const all: Doc<"grants">[] = [...pending, ...underReview, ...noStatus];

    // Sort: deadline ascending; no deadline at the bottom
    all.sort((a, b) => {
      if (a.deadline !== undefined && b.deadline !== undefined) {
        return a.deadline - b.deadline;
      }
      if (a.deadline !== undefined) return -1;
      if (b.deadline !== undefined) return 1;
      return a._creationTime - b._creationTime;
    });

    return all;
  },
});

// ---------------------------------------------------------------------------
// Inbox count for sidebar badge
// ---------------------------------------------------------------------------
export const getInboxCount = query({
  args: {},
  handler: async (ctx) => {
    await requireAllowedUser(ctx);

    const pending = await ctx.db
      .query("grants")
      .withIndex("by_status", (q) => q.eq("status", "pending_analysis"))
      .take(500);

    const underReview = await ctx.db
      .query("grants")
      .withIndex("by_status", (q) => q.eq("status", "under_review"))
      .take(500);

    return pending.length + underReview.length;
  },
});

// ---------------------------------------------------------------------------
// Single grant detail with its funder record
// ---------------------------------------------------------------------------
export const getById = query({
  args: { grantId: v.id("grants") },
  handler: async (ctx, { grantId }) => {
    await requireAllowedUser(ctx);

    const grant = await ctx.db.get(grantId);
    if (!grant) return null;

    const funder = grant.funderId ? await ctx.db.get(grant.funderId) : null;

    return { grant, funder };
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------
export const setUnderReview = mutation({
  args: { grantId: v.id("grants") },
  handler: async (ctx, { grantId }) => {
    await requireAllowedUser(ctx);
    const grant = await ctx.db.get(grantId);
    if (!grant) throw new Error("Grant not found");
    await ctx.db.patch(grantId, { status: "under_review" });
  },
});

export const dismiss = mutation({
  args: {
    grantId: v.id("grants"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { grantId, reason }) => {
    await requireAllowedUser(ctx);
    const grant = await ctx.db.get(grantId);
    if (!grant) throw new Error("Grant not found");
    await ctx.db.patch(grantId, {
      status: "dismissed",
      dismissReason: reason,
    });
  },
});

export const approve = mutation({
  args: { grantId: v.id("grants") },
  handler: async (ctx, { grantId }) => {
    await requireAllowedUser(ctx);
    const grant = await ctx.db.get(grantId);
    if (!grant) throw new Error("Grant not found");
    await ctx.db.patch(grantId, { status: "approved" });
  },
});

// ---------------------------------------------------------------------------
// Active grants — awarded and currently in progress
// ---------------------------------------------------------------------------
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    await requireAllowedUser(ctx);
    return await ctx.db
      .query("grants")
      .withIndex("by_status", (q) => q.eq("status", "accepted"))
      .collect();
  },
});

// ---------------------------------------------------------------------------
// Renewals — accepted grants with an upcoming reapply reminder date
// ---------------------------------------------------------------------------
export const listRenewals = query({
  args: {},
  handler: async (ctx) => {
    await requireAllowedUser(ctx);
    const accepted = await ctx.db
      .query("grants")
      .withIndex("by_status", (q) => q.eq("status", "accepted"))
      .collect();
    return accepted
      .filter((g) => g.reapplyReminderDate !== undefined)
      .sort((a, b) => a.reapplyReminderDate! - b.reapplyReminderDate!);
  },
});

// ---------------------------------------------------------------------------
// Pipeline — approved to apply or submitted, awaiting decision
// ---------------------------------------------------------------------------
export const listPipeline = query({
  args: {},
  handler: async (ctx) => {
    await requireAllowedUser(ctx);
    const approved = await ctx.db
      .query("grants")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();
    const submitted = await ctx.db
      .query("grants")
      .withIndex("by_status", (q) => q.eq("status", "submitted"))
      .collect();
    return [...approved, ...submitted].sort(
      (a, b) =>
        (b.submittedAt ?? b._creationTime) - (a.submittedAt ?? a._creationTime)
    );
  },
});

// ---------------------------------------------------------------------------
// History — dismissed, rejected, or accepted grants
// ---------------------------------------------------------------------------
export const listHistory = query({
  args: {},
  handler: async (ctx) => {
    await requireAllowedUser(ctx);
    const dismissed = await ctx.db
      .query("grants")
      .withIndex("by_status", (q) => q.eq("status", "dismissed"))
      .collect();
    const rejected = await ctx.db
      .query("grants")
      .withIndex("by_status", (q) => q.eq("status", "rejected"))
      .collect();
    const accepted = await ctx.db
      .query("grants")
      .withIndex("by_status", (q) => q.eq("status", "accepted"))
      .collect();
    return [...dismissed, ...rejected, ...accepted].sort(
      (a, b) =>
        (b.decisionDate ?? b._creationTime) -
        (a.decisionDate ?? a._creationTime)
    );
  },
});

// ---------------------------------------------------------------------------
// Pipeline mutations
// ---------------------------------------------------------------------------
export const markSubmitted = mutation({
  args: { grantId: v.id("grants") },
  handler: async (ctx, { grantId }) => {
    await requireAllowedUser(ctx);
    const grant = await ctx.db.get(grantId);
    if (!grant) throw new Error("Grant not found");
    await ctx.db.patch(grantId, { status: "submitted", submittedAt: Date.now() });
  },
});

export const recordDecision = mutation({
  args: {
    grantId: v.id("grants"),
    decision: v.union(v.literal("accepted"), v.literal("rejected")),
    awardAmount: v.optional(v.number()),
    decisionNotes: v.optional(v.string()),
  },
  handler: async (ctx, { grantId, decision, awardAmount, decisionNotes }) => {
    await requireAllowedUser(ctx);
    const grant = await ctx.db.get(grantId);
    if (!grant) throw new Error("Grant not found");
    await ctx.db.patch(grantId, {
      status: decision,
      awardAmount,
      decisionNotes,
      decisionDate: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// Reconsider — move a dismissed grant back to pending_analysis
// ---------------------------------------------------------------------------
export const reconsider = mutation({
  args: { grantId: v.id("grants") },
  handler: async (ctx, { grantId }) => {
    await requireAllowedUser(ctx);
    const grant = await ctx.db.get(grantId);
    if (!grant) throw new Error("Grant not found");
    await ctx.db.patch(grantId, {
      status: "pending_analysis",
      dismissReason: undefined,
    });
  },
});

// ---------------------------------------------------------------------------
// Start renewal — create a draft application linked to the original grant
// ---------------------------------------------------------------------------
export const startRenewal = mutation({
  args: { grantId: v.id("grants") },
  handler: async (ctx, { grantId }) => {
    const identity = await requireAllowedUser(ctx);
    const grant = await ctx.db.get(grantId);
    if (!grant) throw new Error("Grant not found");
    return await ctx.db.insert("applications", {
      grantId,
      status: "draft",
      tokenIdentifier: identity.tokenIdentifier,
      notes: `Renewal draft for: ${grant.title}`,
    });
  },
});

// ---------------------------------------------------------------------------
// AI analysis — public queries
// ---------------------------------------------------------------------------
export const getAnalysis = query({
  args: { grantId: v.id("grants") },
  handler: async (ctx, { grantId }) => {
    await requireAllowedUser(ctx);
    return await ctx.db
      .query("analysis")
      .withIndex("by_grant", (q) => q.eq("grantId", grantId))
      .first();
  },
});

export const listAnalysisScores = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAllowedUser(ctx);
    const analyses = await ctx.db
      .query("analysis")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .take(500);
    return analyses.map((a) => ({
      grantId: a.grantId,
      alignmentScore: a.alignmentScore,
    }));
  },
});

// ---------------------------------------------------------------------------
// AI analysis — internal helpers (called from convex/ai.ts actions)
// ---------------------------------------------------------------------------
export const fetchGrantContext = internalQuery({
  args: {
    grantId: v.id("grants"),
    tokenIdentifier: v.string(),
  },
  handler: async (ctx, { grantId, tokenIdentifier }) => {
    const grant = await ctx.db.get(grantId);
    if (!grant) return null;
    const funder = grant.funderId ? await ctx.db.get(grant.funderId) : null;
    const profile = await ctx.db
      .query("psp_profile")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .first();
    const analysis = await ctx.db
      .query("analysis")
      .withIndex("by_grant", (q) => q.eq("grantId", grantId))
      .first();
    return { grant, funder, profile, analysis };
  },
});

export const storeAnalysisResult = internalMutation({
  args: {
    grantId: v.id("grants"),
    tokenIdentifier: v.string(),
    alignmentScore: v.number(),
    summary: v.string(),
    pros: v.array(v.string()),
    cons: v.array(v.string()),
    recommendedFundingNeed: v.string(),
    suggestedApproach: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { grantId, tokenIdentifier, content, ...fields }) => {
    const existing = await ctx.db
      .query("analysis")
      .withIndex("by_grant", (q) => q.eq("grantId", grantId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { content, ...fields });
    } else {
      await ctx.db.insert("analysis", {
        grantId,
        tokenIdentifier,
        content,
        ...fields,
      });
    }
    await ctx.db.patch(grantId, { status: "under_review" });
  },
});

export const storeDraftContent = internalMutation({
  args: {
    grantId: v.id("grants"),
    tokenIdentifier: v.string(),
    draftContent: v.string(),
  },
  handler: async (ctx, { grantId, tokenIdentifier, draftContent }) => {
    const existing = await ctx.db
      .query("analysis")
      .withIndex("by_grant", (q) => q.eq("grantId", grantId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { draftContent });
    } else {
      await ctx.db.insert("analysis", {
        grantId,
        tokenIdentifier,
        content: "",
        draftContent,
      });
    }
  },
});
