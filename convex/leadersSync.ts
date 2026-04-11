"use node";

import { action, internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
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
// Fetch one page with up to 3 retries on 5xx / rate-limit errors
// ---------------------------------------------------------------------------
async function fetchPage(
  url: string,
  apiKey: string,
  retries = 3
): Promise<OpenStatesResponse> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
    let res: Response;
    try {
      res = await fetch(url, { headers: { "X-API-KEY": apiKey } });
    } catch (err) {
      lastErr = err;
      continue;
    }
    if (res.ok) {
      return res.json() as Promise<OpenStatesResponse>;
    }
    // Hard-fail on 4xx (except 429 rate limit)
    if (res.status >= 400 && res.status < 500 && res.status !== 429) {
      throw new Error(`Open States API error: ${res.status} ${res.statusText}`);
    }
    lastErr = new Error(`Open States API error: ${res.status} ${res.statusText}`);
  }
  throw lastErr;
}

// ---------------------------------------------------------------------------
// Fetch all pages for a state
// ---------------------------------------------------------------------------
async function fetchStateLegislators(
  state: string,
  apiKey: string
): Promise<OpenStatesPerson[]> {
  const all: OpenStatesPerson[] = [];
  let page = 1;

  while (true) {
    const url = `https://v3.openstates.org/people?jurisdiction=${state}&per_page=50&page=${page}`;
    console.log(`[OpenStates] fetching: ${url}`);
    const data = await fetchPage(url, apiKey);
    all.push(...data.results);

    if (page >= data.pagination.max_page || data.results.length === 0) break;
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
    lastName: person.family_name || person.name.split(" ").slice(1).join(" ") || "",
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
// Core sync logic — fetches + upserts one state
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

  return { total: people.length, new: totalNew, updated: totalUpdated, unchanged: totalUnchanged };
}

// ---------------------------------------------------------------------------
// Internal action — syncs the first state in the list, then chains to the next.
// Errors are caught and logged so one bad state never breaks the whole chain.
// ---------------------------------------------------------------------------
export const syncNextState = internalAction({
  args: { remainingStates: v.array(v.string()) },
  handler: async (ctx, args) => {
    const [current, ...rest] = args.remainingStates;
    if (!current) return;

    const apiKey = process.env.OPENSTATES_API_KEY;
    if (!apiKey) throw new Error("OPENSTATES_API_KEY not set");

    console.log(`[syncNextState] syncing ${current} (${rest.length} remaining after this)`);
    try {
      const result = await syncStateImpl(ctx, current, apiKey);
      console.log(`[syncNextState] done ${current}:`, JSON.stringify(result));
    } catch (err) {
      console.error(
        `[syncNextState] FAILED ${current}:`,
        err instanceof Error ? err.message : String(err)
      );
      // Continue the chain even on failure — don't let one state block the rest
    }

    if (rest.length > 0) {
      await ctx.scheduler.runAfter(0, internal.leadersSync.syncNextState, {
        remainingStates: rest,
      });
    } else {
      console.log("[syncNextState] all states complete");
    }
  },
});

// ---------------------------------------------------------------------------
// Public actions — called from the UI
// ---------------------------------------------------------------------------

/** Sync a single state immediately. Called from the Leaders dashboard. */
export const syncState = action({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    await requireAllowedUser(ctx);
    const apiKey = process.env.OPENSTATES_API_KEY;
    if (!apiKey) throw new Error("OPENSTATES_API_KEY not set");
    return syncStateImpl(ctx, args.state.toLowerCase(), apiKey);
  },
});

/**
 * Kick off a chained sync of all 50 states, one at a time.
 * Each state schedules the next when it finishes — no overlap, no contention.
 * Returns immediately; the chain runs entirely in the background.
 */
export const syncAllStates = action({
  args: {},
  handler: async (ctx) => {
    await requireAllowedUser(ctx);
    if (!process.env.OPENSTATES_API_KEY) throw new Error("OPENSTATES_API_KEY not set");

    await ctx.scheduler.runAfter(0, internal.leadersSync.syncNextState, {
      remainingStates: ALL_STATES,
    });

    console.log(`[syncAllStates] chain started — ${ALL_STATES.length} states will run sequentially`);
    return { scheduled: ALL_STATES.length };
  },
});

/**
 * Resume the chain from a specific state code (e.g. "ma" to restart from Massachusetts).
 * Useful after a chain failure to pick up where it left off without re-syncing
 * already-complete states.
 */
export const resumeFrom = action({
  args: { fromState: v.string() },
  handler: async (ctx, args) => {
    await requireAllowedUser(ctx);
    if (!process.env.OPENSTATES_API_KEY) throw new Error("OPENSTATES_API_KEY not set");

    const idx = ALL_STATES.indexOf(args.fromState.toLowerCase());
    if (idx === -1) throw new Error(`Unknown state code: ${args.fromState}`);

    const remaining = ALL_STATES.slice(idx);
    await ctx.scheduler.runAfter(0, internal.leadersSync.syncNextState, {
      remainingStates: remaining,
    });

    console.log(`[resumeFrom] chain restarted from ${args.fromState} — ${remaining.length} states queued`);
    return { scheduled: remaining.length, startingFrom: args.fromState };
  },
});
