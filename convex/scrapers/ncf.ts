"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import {
  extractText,
  parseAmounts,
  parseDeadline,
  truncate,
  FETCH_HEADERS,
} from "./parseUtils";

const SOURCE = "ncfgiving.com";
const FUNDER_URL = "https://www.ncfgiving.com";

// NCF's grant-relevant pages
const PAGES = [
  {
    url: "https://www.ncfgiving.com/stories/grants",
    title: "National Christian Foundation — Grants Overview",
  },
  {
    url: "https://www.ncfgiving.com/nonprofits",
    title: "National Christian Foundation — Nonprofit Resources",
  },
];

export async function scrape(ctx: ActionCtx) {
  let grantsFound = 0;
  let grantsAdded = 0;

  try {
    const funderId = await ctx.runMutation(
      internal.scrapers.mutations.upsertFunder,
      {
        name: "National Christian Foundation",
        website: FUNDER_URL,
        faithAligned: true,
        acceptsUnsolicited: "yes",
        requiresInvitation: false,
        notes:
          "Donor-advised fund platform that channels grants to faith-based nonprofits. " +
          "Grants flow from individual donor accounts — apply via the donor portal or " +
          "register your nonprofit at ncfgiving.com/nonprofits to be grant-eligible.",
      }
    );

    for (const page of PAGES) {
      try {
        const res = await fetch(page.url, { headers: FETCH_HEADERS });
        if (!res.ok) continue;
        const text = extractText(await res.text());
        const { amountMin, amountMax } = parseAmounts(text);
        const deadline = parseDeadline(text);

        const wasAdded = await ctx.runMutation(
          internal.scrapers.mutations.upsertGrant,
          {
            title: page.title,
            funderName: "National Christian Foundation",
            funderId,
            sourceUrl: page.url,
            funderUrl: FUNDER_URL,
            amountMin,
            amountMax,
            deadline,
            isRecurring: true,
            acceptsUnsolicited: "yes",
            requiresLoi: false,
            rawText: truncate(text),
          }
        );
        grantsFound++;
        if (wasAdded) grantsAdded++;
      } catch {
        // continue to next page
      }
    }
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
