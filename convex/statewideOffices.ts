import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAllowedUser } from "./lib/auth";

// ---------------------------------------------------------------------------
// Standard statewide executive offices (all states except Nebraska)
// ---------------------------------------------------------------------------
export const STATEWIDE_OFFICES = [
  "Governor",
  "Lieutenant Governor",
  "Attorney General",
  "Secretary of State",
  "State Treasurer",
  "State Comptroller / Auditor",
] as const;

// Nebraska has no Lieutenant Governor; the Legislature Speaker serves as successor.
const NEBRASKA_OFFICES = [
  "Governor",
  "Legislature Speaker",
  "Attorney General",
  "Secretary of State",
  "State Treasurer",
  "State Comptroller / Auditor",
] as const;

// ---------------------------------------------------------------------------
// Query: statewide offices for a given state, merged with DB records
// ---------------------------------------------------------------------------
export const getStatewideLeaders = query({
  args: { stateCode: v.string() },
  handler: async (ctx, args) => {
    await requireAllowedUser(ctx);
    const state = args.stateCode.toLowerCase();

    const leaders = await ctx.db
      .query("leaders")
      .withIndex("by_state_and_branch", (q) =>
        q.eq("state", state).eq("branch", "executive")
      )
      .take(50);

    const offices: readonly string[] =
      state === "ne" ? NEBRASKA_OFFICES : STATEWIDE_OFFICES;

    return offices.map((office) => {
      const leader = leaders.find((l) => l.office === office);
      if (leader) {
        return { office, filled: true as const, leader };
      }
      return { office, filled: false as const, leader: null };
    });
  },
});
