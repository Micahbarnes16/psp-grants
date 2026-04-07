import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAllowedUser } from "./lib/auth";

export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAllowedUser(ctx);
    return await ctx.db
      .query("psp_profile")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();
  },
});

export const upsertProfile = mutation({
  args: {
    name: v.string(),
    mission: v.string(),
    ein: v.optional(v.string()),
    website: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    focusAreas: v.array(v.string()),
    primaryPrograms: v.optional(v.string()),
    geographicScope: v.optional(v.string()),
    annualBudget: v.optional(v.string()),
    foundedYear: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAllowedUser(ctx);
    const existing = await ctx.db
      .query("psp_profile")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("psp_profile", {
        ...args,
        tokenIdentifier: identity.tokenIdentifier,
      });
    }
  },
});

export const saveNotificationPrefs = mutation({
  args: {
    notifyNewGrants: v.boolean(),
    notifyEmail: v.string(),
    notifyMinScore: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAllowedUser(ctx);
    const existing = await ctx.db
      .query("psp_profile")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      // Create a minimal profile record to store notification prefs
      await ctx.db.insert("psp_profile", {
        name: "",
        mission: "",
        focusAreas: [],
        tokenIdentifier: identity.tokenIdentifier,
        ...args,
      });
    }
  },
});
