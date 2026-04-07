import { query, mutation } from "./_generated/server";
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
