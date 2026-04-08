import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

const acceptsUnsolicitedV = v.optional(
  v.union(v.literal("yes"), v.literal("no"), v.literal("unknown"))
);

// ---------------------------------------------------------------------------
// Funder upsert — matches on website URL; returns the funder's _id.
// ---------------------------------------------------------------------------
export const upsertFunder = internalMutation({
  args: {
    name: v.string(),
    website: v.string(),
    faithAligned: v.optional(v.boolean()),
    acceptsUnsolicited: acceptsUnsolicitedV,
    requiresInvitation: v.optional(v.boolean()),
    monitorForReopening: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("funders")
      .withIndex("by_website", (q) => q.eq("website", args.website))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        faithAligned: args.faithAligned,
        acceptsUnsolicited: args.acceptsUnsolicited,
        requiresInvitation: args.requiresInvitation,
        monitorForReopening: args.monitorForReopening,
        notes: args.notes,
        lastScrapedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("funders", {
      name: args.name,
      website: args.website,
      faithAligned: args.faithAligned,
      acceptsUnsolicited: args.acceptsUnsolicited,
      requiresInvitation: args.requiresInvitation,
      monitorForReopening: args.monitorForReopening,
      notes: args.notes,
      lastScrapedAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// Grant upsert — deduplicates on sourceUrl. Returns true if newly inserted.
// ---------------------------------------------------------------------------
export const upsertGrant = internalMutation({
  args: {
    title: v.string(),
    funderName: v.string(),
    funderId: v.optional(v.id("funders")),
    sourceUrl: v.string(),
    funderUrl: v.optional(v.string()),
    deadline: v.optional(v.number()),
    amountMin: v.optional(v.number()),
    amountMax: v.optional(v.number()),
    isRecurring: v.optional(v.boolean()),
    acceptsUnsolicited: acceptsUnsolicitedV,
    requiresLoi: v.optional(v.boolean()),
    rawText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("grants")
      .withIndex("by_source_url", (q) => q.eq("sourceUrl", args.sourceUrl))
      .first();

    if (existing) {
      // Refresh volatile fields on each scrape run.
      // Also backfill status on records inserted before it became required.
      const statusPatch =
        (existing as { status?: string }).status === undefined
          ? { status: "pending_analysis" as const }
          : {};
      await ctx.db.patch(existing._id, {
        deadline: args.deadline,
        rawText: args.rawText,
        amountMin: args.amountMin,
        amountMax: args.amountMax,
        funderId: args.funderId,
        ...statusPatch,
      });
      return false;
    }

    const grantId = await ctx.db.insert("grants", {
      title: args.title,
      funderName: args.funderName,
      funderId: args.funderId,
      sourceUrl: args.sourceUrl,
      funderUrl: args.funderUrl,
      deadline: args.deadline,
      amountMin: args.amountMin,
      amountMax: args.amountMax,
      isRecurring: args.isRecurring,
      acceptsUnsolicited: args.acceptsUnsolicited,
      requiresLoi: args.requiresLoi,
      rawText: args.rawText,
      discoveredAt: Date.now(),
      status: "pending_analysis",
    });

    // Auto-analyze every new grant using the background action.
    await ctx.scheduler.runAfter(0, internal.ai.analyzeGrantInternal, {
      grantId,
    });

    return true;
  },
});

// ---------------------------------------------------------------------------
// Scraper run log
// ---------------------------------------------------------------------------
export const logRun = internalMutation({
  args: {
    source: v.string(),
    grantsFound: v.number(),
    grantsAdded: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("scraper_log", {
      source: args.source,
      grantsFound: args.grantsFound,
      grantsAdded: args.grantsAdded,
      error: args.error,
    });
  },
});
