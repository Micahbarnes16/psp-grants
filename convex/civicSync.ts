"use node";

import { action } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireAllowedUser } from "./lib/auth";

// ---------------------------------------------------------------------------
// All 50 state codes (uppercase)
// ---------------------------------------------------------------------------
const ALL_STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

// ---------------------------------------------------------------------------
// State code → full state name as returned by Congress.gov (e.g. "Indiana")
// ---------------------------------------------------------------------------
const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",       AK: "Alaska",         AZ: "Arizona",
  AR: "Arkansas",      CA: "California",      CO: "Colorado",
  CT: "Connecticut",   DE: "Delaware",        FL: "Florida",
  GA: "Georgia",       HI: "Hawaii",          ID: "Idaho",
  IL: "Illinois",      IN: "Indiana",         IA: "Iowa",
  KS: "Kansas",        KY: "Kentucky",        LA: "Louisiana",
  ME: "Maine",         MD: "Maryland",        MA: "Massachusetts",
  MI: "Michigan",      MN: "Minnesota",       MS: "Mississippi",
  MO: "Missouri",      MT: "Montana",         NE: "Nebraska",
  NV: "Nevada",        NH: "New Hampshire",   NJ: "New Jersey",
  NM: "New Mexico",    NY: "New York",        NC: "North Carolina",
  ND: "North Dakota",  OH: "Ohio",            OK: "Oklahoma",
  OR: "Oregon",        PA: "Pennsylvania",    RI: "Rhode Island",
  SC: "South Carolina",SD: "South Dakota",    TN: "Tennessee",
  TX: "Texas",         UT: "Utah",            VT: "Vermont",
  VA: "Virginia",      WA: "Washington",      WV: "West Virginia",
  WI: "Wisconsin",     WY: "Wyoming",
};

// ---------------------------------------------------------------------------
// Congress.gov API types
// ---------------------------------------------------------------------------
interface CongressTerm {
  chamber: string;
  startYear?: number;
  endYear?: number;
}

interface CongressMember {
  bioguideId: string;
  name: string;
  state?: string;
  party?: string;
  district?: number;
  terms?: { item?: CongressTerm[] };
  depiction?: { imageUrl?: string };
}

interface CongressResponse {
  members?: CongressMember[];
  pagination?: { count?: number; next?: string };
  error?: { message: string };
}

// ---------------------------------------------------------------------------
// Module-level cache — within a single syncAllFederalLeaders invocation the
// full member list is fetched once and reused for all 50 state filter passes.
// ---------------------------------------------------------------------------
let memberCache: CongressMember[] | null = null;

async function fetchAllCurrentMembers(apiKey: string): Promise<CongressMember[]> {
  if (memberCache !== null) return memberCache;

  const all: CongressMember[] = [];
  const limit = 250;
  let offset = 0;

  // 535 total members → 3 pages maximum
  while (true) {
    const url =
      `https://api.congress.gov/v3/member` +
      `?currentMember=true` +
      `&limit=${limit}` +
      `&offset=${offset}` +
      `&format=json` +
      `&api_key=${apiKey}`;

    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Congress.gov API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data: CongressResponse = await res.json();
    const page = data.members ?? [];
    all.push(...page);

    if (page.length < limit) break; // reached last page
    offset += limit;
  }

  memberCache = all;
  console.log(`[civicSync] fetched ${all.length} current members from Congress.gov`);

  // Per-state breakdown using last-term chamber — helps verify total adds up
  const byState: Record<string, { senators: number; reps: number }> = {};
  for (const m of all) {
    if (!m.state) continue;
    const items = m.terms?.item;
    const lastChamber = items && items.length > 0 ? items[items.length - 1].chamber : null;
    if (!byState[m.state]) byState[m.state] = { senators: 0, reps: 0 };
    if (lastChamber === "Senate") byState[m.state].senators++;
    else if (lastChamber === "House of Representatives") byState[m.state].reps++;
  }
  const lines = Object.entries(byState)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([s, c]) => `${s}: ${c.senators}S ${c.reps}H`)
    .join(", ");
  console.log(`[civicSync] per-state breakdown: ${lines}`);

  return all;
}

// ---------------------------------------------------------------------------
// Core sync logic — filters the full member list for one state and upserts
// ---------------------------------------------------------------------------
async function syncStateImpl(
  ctx: ActionCtx,
  stateCode: string,
  apiKey: string
): Promise<{ synced: number; state: string }> {
  const state = stateCode.toUpperCase();
  const stateName = STATE_NAMES[state];
  if (!stateName) throw new Error(`Unknown state code: ${stateCode}`);

  const allMembers = await fetchAllCurrentMembers(apiKey);

  const stateMembers = allMembers.filter((m) => m.state === stateName);

  // Use the last entry in terms.item to determine current chamber — more
  // reliable than requiring !endYear since some current members have endYear
  // set to the current or future year rather than leaving it absent.
  const senators = stateMembers.filter((m) => {
    const items = m.terms?.item;
    return items && items.length > 0 && items[items.length - 1].chamber === "Senate";
  });
  const reps = stateMembers.filter((m) => {
    const items = m.terms?.item;
    return items && items.length > 0 && items[items.length - 1].chamber === "House of Representatives";
  });

  const now = Date.now();
  let synced = 0;

  for (const [members, chamber, officeName] of [
    [senators, "u.s._senate", "U.S. Senator"] as const,
    [reps, "u.s._house", "U.S. Representative"] as const,
  ]) {
    for (const member of members) {
      // Congress.gov returns names as "Last, First Middle" — flip to "First Last"
      const fullName = member.name.includes(",")
        ? (() => {
            const [last, ...rest] = member.name.split(/,\s*/);
            return `${rest.join(" ")} ${last}`.trim();
          })()
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

  console.log(`[civicSync] ${state}: ${senators.length} senators, ${reps.length} reps → ${synced} upserted`);
  return { synced, state };
}

// ---------------------------------------------------------------------------
// Public actions — same signatures; no other files need to change
// ---------------------------------------------------------------------------

/** Sync U.S. Senators and Representatives for a single state. */
export const syncFederalLeaders = action({
  args: { stateCode: v.string() },
  handler: async (ctx, args) => {
    await requireAllowedUser(ctx);
    const apiKey = process.env.CONGRESS_API_KEY;
    if (!apiKey) throw new Error("CONGRESS_API_KEY not set");
    // Clear cache so a standalone single-state call always gets fresh data
    memberCache = null;
    return syncStateImpl(ctx, args.stateCode, apiKey);
  },
});

/**
 * Sync federal legislators for all 50 states.
 * Fetches the full 535-member list once (≤3 API calls), then filters in code
 * for each state — no per-state API calls needed.
 */
export const syncAllFederalLeaders = action({
  args: {},
  handler: async (ctx) => {
    await requireAllowedUser(ctx);
    const apiKey = process.env.CONGRESS_API_KEY;
    if (!apiKey) throw new Error("CONGRESS_API_KEY not set");

    // Reset cache at the start of a full sync so we always get fresh data
    memberCache = null;

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
      // Small yield between states; no API calls after first page load
      await new Promise((r) => setTimeout(r, 10));
    }

    return { totalSynced, statesProcessed: ALL_STATE_CODES.length, errors };
  },
});
