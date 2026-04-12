"use node";

import { action } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireAllowedUser } from "./lib/auth";

// ---------------------------------------------------------------------------
// All 50 state codes (uppercase, as Congress.gov expects)
// ---------------------------------------------------------------------------
const ALL_STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

// ---------------------------------------------------------------------------
// Congress.gov API types
// ---------------------------------------------------------------------------
interface CongressMember {
  bioguideId: string;
  name: string;
  party?: string;
  state?: string;
  district?: number;
  depiction?: {
    imageUrl?: string;
  };
}

interface CongressResponse {
  members?: CongressMember[];
  error?: { message: string };
}

// ---------------------------------------------------------------------------
// Fetch members for one state + chamber from Congress.gov
// ---------------------------------------------------------------------------
async function fetchMembers(
  stateCode: string,
  chamber: "Senate" | "House",
  apiKey: string
): Promise<CongressMember[]> {
  const limit = chamber === "Senate" ? 10 : 60;
  const url =
    `https://api.congress.gov/v3/member` +
    `?stateCode=${encodeURIComponent(stateCode)}` +
    `&chamber=${chamber}` +
    `&currentMember=true` +
    `&limit=${limit}` +
    `&api_key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Congress.gov API error (${chamber}): ${res.status} ${res.statusText}`);
  }
  const data: CongressResponse = await res.json();
  return data.members ?? [];
}

// ---------------------------------------------------------------------------
// Core sync logic — fetches + upserts federal legislators for one state
// ---------------------------------------------------------------------------
async function syncStateImpl(
  ctx: ActionCtx,
  stateCode: string,
  apiKey: string
): Promise<{ synced: number; state: string }> {
  const state = stateCode.toUpperCase();

  const [senators, representatives] = await Promise.all([
    fetchMembers(state, "Senate", apiKey),
    fetchMembers(state, "House", apiKey),
  ]);

  const now = Date.now();
  let synced = 0;

  for (const [members, chamber, officeName] of [
    [senators, "u.s._senate", "U.S. Senator"] as const,
    [representatives, "u.s._house", "U.S. Representative"] as const,
  ]) {
    for (const member of members) {
      const nameParts = member.name.trim().split(/,\s*|\s+/);
      // Congress.gov returns names as "Last, First" or "First Last"
      const fullName = member.name.includes(",")
        ? `${nameParts.slice(1).join(" ")} ${nameParts[0]}`.trim()
        : member.name.trim();
      const firstName = fullName.split(" ")[0] ?? "";
      const lastName = fullName.split(" ").slice(1).join(" ");

      await ctx.runMutation(internal.leaders.upsertFederalLeader, {
        externalId: member.bioguideId,
        firstName,
        lastName,
        fullName,
        state: state.toLowerCase(),
        chamber,
        office: officeName,
        party: member.party,
        photoUrl: member.depiction?.imageUrl,
        district: member.district !== undefined ? String(member.district) : undefined,
        branch: "federal_legislative",
        level: "federal",
        source: "congress_gov",
        inOffice: true,
        lastSyncedAt: now,
      });

      synced++;
    }
  }

  console.log(`[civicSync] ${state}: synced ${synced} federal legislators from Congress.gov`);
  return { synced, state };
}

// ---------------------------------------------------------------------------
// Public actions — same signatures as before; no other files need to change
// ---------------------------------------------------------------------------

/** Sync U.S. Senators and Representatives for a single state. */
export const syncFederalLeaders = action({
  args: { stateCode: v.string() },
  handler: async (ctx, args) => {
    await requireAllowedUser(ctx);
    const apiKey = process.env.CONGRESS_API_KEY;
    if (!apiKey) throw new Error("CONGRESS_API_KEY not set");
    return syncStateImpl(ctx, args.stateCode, apiKey);
  },
});

/**
 * Sync federal legislators for all 50 states sequentially.
 * 200 ms delay between states to stay within API rate limits.
 */
export const syncAllFederalLeaders = action({
  args: {},
  handler: async (ctx) => {
    await requireAllowedUser(ctx);
    const apiKey = process.env.CONGRESS_API_KEY;
    if (!apiKey) throw new Error("CONGRESS_API_KEY not set");

    let totalSynced = 0;
    const errors: string[] = [];

    for (const stateCode of ALL_STATE_CODES) {
      try {
        const result = await syncStateImpl(ctx, stateCode, apiKey);
        totalSynced += result.synced;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[syncAllFederalLeaders] ${stateCode} failed: ${msg}`);
        errors.push(`${stateCode}: ${msg}`);
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    return { totalSynced, statesProcessed: ALL_STATE_CODES.length, errors };
  },
});
