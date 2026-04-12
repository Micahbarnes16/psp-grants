"use node";

import { action } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireAllowedUser } from "./lib/auth";

// ---------------------------------------------------------------------------
// All 50 state codes (uppercase, as the Civic API prefers)
// ---------------------------------------------------------------------------
const ALL_STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

// ---------------------------------------------------------------------------
// Google Civic Information API types
// ---------------------------------------------------------------------------
interface CivicOfficial {
  name: string;
  party?: string;
  phones?: string[];
  urls?: string[];
  photoUrl?: string;
  emails?: string[];
}

interface CivicOffice {
  name: string;
  roles: string[];
  officialIndices: number[];
}

interface CivicResponse {
  offices?: CivicOffice[];
  officials?: CivicOfficial[];
  error?: { message: string };
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
  const url =
    `https://www.googleapis.com/civicinfo/v2/representatives` +
    `?address=${encodeURIComponent(state)}` +
    `&levels=country` +
    `&roles=legislatorUpperBody` +
    `&roles=legislatorLowerBody` +
    `&key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Google Civic API error: ${res.status} ${res.statusText}`);
  }

  const data: CivicResponse = await res.json();

  if (!data.offices || !data.officials) {
    console.log(`[civicSync] ${state}: no offices/officials in response`);
    return { synced: 0, state };
  }

  let synced = 0;
  const now = Date.now();

  for (const office of data.offices) {
    const isUpperBody = office.roles.includes("legislatorUpperBody");
    const isLowerBody = office.roles.includes("legislatorLowerBody");
    if (!isUpperBody && !isLowerBody) continue;

    const chamber = isUpperBody ? "u.s._senate" : "u.s._house";
    const officeName = isUpperBody ? "U.S. Senator" : "U.S. Representative";

    for (const idx of office.officialIndices) {
      const official = data.officials[idx];
      if (!official) continue;

      const nameParts = official.name.trim().split(/\s+/);
      const firstName = nameParts[0] ?? "";
      const lastName = nameParts.slice(1).join(" ");
      // Stable synthetic ID: source + state + normalized name + chamber
      const normalizedName = official.name
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
      const externalId = `civic_${state.toLowerCase()}_${normalizedName}_${chamber}`;

      await ctx.runMutation(internal.leaders.upsertFederalLeader, {
        externalId,
        firstName,
        lastName,
        fullName: official.name,
        state: state.toLowerCase(),
        chamber,
        office: officeName,
        party: official.party,
        photoUrl: official.photoUrl,
        phone: official.phones?.[0],
        website: official.urls?.[0],
        email: official.emails?.[0],
        branch: "federal_legislative",
        level: "federal",
        source: "google_civic",
        inOffice: true,
        lastSyncedAt: now,
      });

      synced++;
    }
  }

  console.log(`[civicSync] ${state}: synced ${synced} federal legislators`);
  return { synced, state };
}

// ---------------------------------------------------------------------------
// Public actions
// ---------------------------------------------------------------------------

/** Sync U.S. Senators and Representatives for a single state. */
export const syncFederalLeaders = action({
  args: { stateCode: v.string() },
  handler: async (ctx, args) => {
    await requireAllowedUser(ctx);
    const apiKey = process.env.GOOGLE_CIVIC_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_CIVIC_API_KEY not set");
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
    const apiKey = process.env.GOOGLE_CIVIC_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_CIVIC_API_KEY not set");

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
