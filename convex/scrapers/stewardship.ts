"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { extractText, truncate, FETCH_HEADERS } from "./parseUtils";

const SOURCE = "stewardshipfdn.org";
const FUNDER_URL = "https://www.stewardshipfdn.org";
const PAGE_URL =
  "https://www.stewardshipfdn.org/applying-for-funding/eligibility-for-funding";

export async function scrape(ctx: ActionCtx) {
  let grantsFound = 0;
  let grantsAdded = 0;

  try {
    let rawText = "Page could not be fetched — check site manually.";

    try {
      const res = await fetch(PAGE_URL, { headers: FETCH_HEADERS });
      if (res.ok) rawText = truncate(extractText(await res.text()));
    } catch {
      // fetch failed — still create the record with known info
    }

    // Mark as suspended/monitoring regardless of page content
    const funderId = await ctx.runMutation(
      internal.scrapers.mutations.upsertFunder,
      {
        name: "Stewardship Foundation",
        website: FUNDER_URL,
        faithAligned: true,
        acceptsUnsolicited: "no",
        requiresInvitation: false,
        monitorForReopening: true,
        notes:
          "GRANTMAKING CURRENTLY SUSPENDED. Previously funded Christian nonprofits " +
          "in the Pacific Northwest. Monitor stewardshipfdn.org for announcements " +
          "about resumed grantmaking.",
      }
    );

    const wasAdded = await ctx.runMutation(
      internal.scrapers.mutations.upsertGrant,
      {
        title: "Stewardship Foundation — Eligibility Information [SUSPENDED]",
        funderName: "Stewardship Foundation",
        funderId,
        sourceUrl: PAGE_URL,
        funderUrl: FUNDER_URL,
        isRecurring: false,
        acceptsUnsolicited: "no",
        requiresLoi: false,
        rawText,
      }
    );
    grantsFound = 1;
    if (wasAdded) grantsAdded = 1;
  } catch (err) {
    const error = String(err);
    await ctx.runMutation(internal.scrapers.mutations.logRun, {
      source: SOURCE,
      grantsFound,
      grantsAdded,
      error,
    });
    return { source: SOURCE, grantsFound, grantsAdded, error };
  }

  await ctx.runMutation(internal.scrapers.mutations.logRun, {
    source: SOURCE,
    grantsFound,
    grantsAdded,
  });
  return { source: SOURCE, grantsFound, grantsAdded };
}

export const run = internalAction({
  args: {},
  handler: (ctx) => scrape(ctx),
});
