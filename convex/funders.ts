import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAllowedUser } from "./lib/auth";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAllowedUser(ctx);
    return await ctx.db.query("funders").collect();
  },
});

export const toggleSuspended = mutation({
  args: { funderId: v.id("funders") },
  handler: async (ctx, { funderId }) => {
    await requireAllowedUser(ctx);
    const funder = await ctx.db.get(funderId);
    if (!funder) throw new Error("Funder not found");
    await ctx.db.patch(funderId, {
      suspended: !(funder as { suspended?: boolean }).suspended,
    });
  },
});
