import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { requireAllowedUser } from "./lib/auth";

// ---------------------------------------------------------------------------
// Shared helper: fetch all analysis scores as a grantId → score map
// ---------------------------------------------------------------------------
async function buildScoreMap(
  ctx: QueryCtx
): Promise<Record<string, number | undefined>> {
  const analyses = await ctx.db.query("analysis").take(500);
  const map: Record<string, number | undefined> = {};
  for (const a of analyses) {
    map[a.grantId as string] = a.alignmentScore;
  }
  return map;
}

// ---------------------------------------------------------------------------
// Inbox list — actionable grants only:
//   • acceptsUnsolicited is "yes" or "unknown" (invite-only → Watchlist)
//   • deadline is in the future or not set (expired → excluded)
//   • alignment score > 20 or not yet analyzed (noise filtered out)
// Sorted deadline ascending.
// ---------------------------------------------------------------------------
export const listInbox = query({
  args: {},
  handler: async (ctx) => {
    await requireAllowedUser(ctx);
    const now = Date.now();

    const pending = await ctx.db
      .query("grants")
      .withIndex("by_status", (q) => q.eq("status", "pending_analysis"))
      .take(200);

    const underReview = await ctx.db
      .query("grants")
      .withIndex("by_status", (q) => q.eq("status", "under_review"))
      .take(200);

    const scoreMap = await buildScoreMap(ctx);

    const all = [...pending, ...underReview].filter((g) => {
      if (g.acceptsUnsolicited === "no") return false;
      if (g.deadline !== undefined && g.deadline < now) return false;
      const score = scoreMap[g._id as string];
      if (score !== undefined && score <= 20) return false;
      return true;
    });

    all.sort((a, b) => {
      if (a.deadline !== undefined && b.deadline !== undefined)
        return a.deadline - b.deadline;
      if (a.deadline !== undefined) return -1;
      if (b.deadline !== undefined) return 1;
      return a._creationTime - b._creationTime;
    });

    return all;
  },
});

// ---------------------------------------------------------------------------
// Inbox count for sidebar badge — mirrors listInbox filters
// ---------------------------------------------------------------------------
export const getInboxCount = query({
  args: {},
  handler: async (ctx) => {
    await requireAllowedUser(ctx);
    const now = Date.now();

    const pending = await ctx.db
      .query("grants")
      .withIndex("by_status", (q) => q.eq("status", "pending_analysis"))
      .take(500);

    const underReview = await ctx.db
      .query("grants")
      .withIndex("by_status", (q) => q.eq("status", "under_review"))
      .take(500);

    const scoreMap = await buildScoreMap(ctx);

    return [...pending, ...underReview].filter((g) => {
      if (g.acceptsUnsolicited === "no") return false;
      if (g.deadline !== undefined && g.deadline < now) return false;
      const score = scoreMap[g._id as string];
      if (score !== undefined && score <= 20) return false;
      return true;
    }).length;
  },
});

// ---------------------------------------------------------------------------
// Watchlist — invite-only / relationship-required grants worth monitoring
// ---------------------------------------------------------------------------
export const listWatchlist = query({
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

    const scoreMap = await buildScoreMap(ctx);

    return [...pending, ...underReview]
      .filter((g) => g.acceptsUnsolicited === "no")
      .sort(
        (a, b) =>
          (scoreMap[b._id as string] ?? 0) - (scoreMap[a._id as string] ?? 0)
      );
  },
});

export const getWatchlistCount = query({
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

    return [...pending, ...underReview].filter(
      (g) => g.acceptsUnsolicited === "no"
    ).length;
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

// Move a watchlist grant back into the actionable inbox by marking it
// as accepting unsolicited applications (e.g. PSP has made contact).
export const markAccessible = mutation({
  args: { grantId: v.id("grants") },
  handler: async (ctx, { grantId }) => {
    await requireAllowedUser(ctx);
    const grant = await ctx.db.get(grantId);
    if (!grant) throw new Error("Grant not found");
    await ctx.db.patch(grantId, { acceptsUnsolicited: "yes" });
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
    await requireAllowedUser(ctx);
    // Return all analyses (shared single-org app) so auto-generated scores
    // from the scraper pipeline are visible to every allowed user.
    const analyses = await ctx.db.query("analysis").take(500);
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

// Auto-dismiss a grant after AI analysis scores it very low.
// Only dismisses if the grant is still in an inbox status — does not
// override user decisions (approved, submitted, etc.).
export const autoDismissGrant = internalMutation({
  args: { grantId: v.id("grants"), reason: v.string() },
  handler: async (ctx, { grantId, reason }) => {
    const grant = await ctx.db.get(grantId);
    if (!grant) return;
    if (
      grant.status === "pending_analysis" ||
      grant.status === "under_review"
    ) {
      await ctx.db.patch(grantId, { status: "dismissed", dismissReason: reason });
    }
  },
});

// ---------------------------------------------------------------------------
// One-time admin: clear all inbox grants (pending_analysis / under_review)
// and their associated analysis records.
// Run via: npx convex run grants:clearInboxGrants --prod
// ---------------------------------------------------------------------------
export const clearInboxGrants = internalMutation({
  args: {},
  handler: async (ctx) => {
    const pending = await ctx.db
      .query("grants")
      .withIndex("by_status", (q) => q.eq("status", "pending_analysis"))
      .take(200);

    const underReview = await ctx.db
      .query("grants")
      .withIndex("by_status", (q) => q.eq("status", "under_review"))
      .take(200);

    // Legacy records with no status
    const allGrants = await ctx.db.query("grants").take(1000);
    const noStatus = allGrants.filter(
      (g) => (g as { status?: string }).status === undefined
    );

    const toDelete = [...pending, ...underReview, ...noStatus];

    let deleted = 0;
    for (const grant of toDelete) {
      const analyses = await ctx.db
        .query("analysis")
        .withIndex("by_grant", (q) => q.eq("grantId", grant._id))
        .take(10);
      for (const a of analyses) {
        await ctx.db.delete(a._id);
      }
      await ctx.db.delete(grant._id);
      deleted++;
    }

    console.log(`[clearInboxGrants] Deleted ${deleted} grants and their analyses.`);
    return { deleted };
  },
});
