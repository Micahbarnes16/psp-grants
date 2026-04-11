"use node";

import { action } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireAllowedUser } from "./lib/auth";

// ---------------------------------------------------------------------------
// All 50 US state codes (Open States jurisdiction identifiers)
// ---------------------------------------------------------------------------
const ALL_STATES = [
  "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga",
  "hi", "id", "il", "in", "ia", "ks", "ky", "la", "me", "md",
  "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv", "nh", "nj",
  "nm", "ny", "nc", "nd", "oh", "ok", "or", "pa", "ri", "sc",
  "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv", "wi", "wy",
];

const BATCH_SIZE = 25;

// ---------------------------------------------------------------------------
// Open States v3 REST API types
// ---------------------------------------------------------------------------
interface OpenStatesPerson {
  id: string;
  name: string;
  given_name: string;
  family_name: string;
  image?: string;
  email?: string;
  party: string;
  birth_date?: string;
  current_role?: {
    title: string;
    org_classification: string;
    district?: string;
  };
  jurisdiction: {
    id: string;
    name: string;
    classification: string;
  };
  links?: Array<{ url: string; note?: string }>;
}

interface OpenStatesResponse {
  results: OpenStatesPerson[];
  pagination: {
    max_page: number;
    page: number;
    per_page: number;
    total_items: number;
  };
}

// ---------------------------------------------------------------------------
// Fetch all legislators for a state from Open States v3 REST API
// ---------------------------------------------------------------------------
async function fetchStateLegislators(
  state: string,
  apiKey: string
): Promise<OpenStatesPerson[]> {
  const all: OpenStatesPerson[] = [];
  let page = 1;

  while (true) {
    const url = `https://v3.openstates.org/people?jurisdiction=${state}&include=other_names&per_page=100&page=${page}`;
    const res = await fetch(url, {
      headers: { "X-API-KEY": apiKey },
    });

    if (!res.ok) {
      throw new Error(
        `Open States API error for ${state}: ${res.status} ${res.statusText}`
      );
    }

    const data: OpenStatesResponse = await res.json();
    all.push(...data.results);

    if (page >= data.pagination.max_page || data.results.length === 0) {
      break;
    }
    page++;
  }

  return all;
}

function personToLeaderData(person: OpenStatesPerson, state: string) {
  const chamber = person.current_role?.org_classification ?? "unknown";
  const website = person.links?.[0]?.url;

  return {
    externalId: person.id,
    firstName: person.given_name || person.name.split(" ")[0] || "",
    lastName:
      person.family_name || person.name.split(" ").slice(1).join(" ") || "",
    fullName: person.name,
    state: state.toLowerCase(),
    chamber,
    district: person.current_role?.district ?? undefined,
    party: person.party || undefined,
    title: person.current_role?.title ?? undefined,
    photoUrl: person.image ?? undefined,
    email: person.email ?? undefined,
    website: website ?? undefined,
    birthday: person.birth_date ?? undefined,
    level: "state",
    branch: "legislative",
    inOffice: true,
    lastSyncedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Core sync logic — shared between syncState and syncAllStates
// ---------------------------------------------------------------------------
async function syncStateImpl(
  ctx: ActionCtx,
  state: string,
  apiKey: string
): Promise<{ total: number; new: number; updated: number; unchanged: number }> {
  const people = await fetchStateLegislators(state, apiKey);

  let totalNew = 0;
  let totalUpdated = 0;
  let totalUnchanged = 0;

  for (let i = 0; i < people.length; i += BATCH_SIZE) {
    const batch = people.slice(i, i + BATCH_SIZE);
    const leaderDataBatch = batch.map((p) => personToLeaderData(p, state));

    const result: { new: number; updated: number; unchanged: number } =
      await ctx.runMutation(internal.leaders.batchUpsertLeaders, {
        leaders: leaderDataBatch,
      });

    totalNew += result.new;
    totalUpdated += result.updated;
    totalUnchanged += result.unchanged;
  }

  return {
    total: people.length,
    new: totalNew,
    updated: totalUpdated,
    unchanged: totalUnchanged,
  };
}

// ---------------------------------------------------------------------------
// Public actions
// ---------------------------------------------------------------------------

export const syncState = action({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    await requireAllowedUser(ctx);
    const apiKey = process.env.OPENSTATES_API_KEY;
    if (!apiKey) throw new Error("OPENSTATES_API_KEY not set");
    return syncStateImpl(ctx, args.state.toLowerCase(), apiKey);
  },
});

export const syncAllStates = action({
  args: {},
  handler: async (ctx) => {
    await requireAllowedUser(ctx);
    const apiKey = process.env.OPENSTATES_API_KEY;
    if (!apiKey) throw new Error("OPENSTATES_API_KEY not set");

    const results: Array<{
      state: string;
      total: number;
      new: number;
      updated: number;
      unchanged: number;
      error?: string;
    }> = [];

    for (const state of ALL_STATES) {
      try {
        const result = await syncStateImpl(ctx, state, apiKey);
        results.push({ state, ...result });
      } catch (err) {
        console.error(`Failed to sync state ${state}:`, err);
        results.push({
          state,
          total: 0,
          new: 0,
          updated: 0,
          unchanged: 0,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
      // Delay between states to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return results;
  },
});
