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

const SOURCE = "givingcompass.org";
const FUNDER_URL = "https://givingcompass.org";

// Giving Compass search pages for faith-based grants
const PAGES = [
  {
    url: "https://givingcompass.org/funds?causes=religion",
    title: "Giving Compass — Faith & Religion Grants",
  },
  {
    url: "https://givingcompass.org/funds?causes=civic-engagement",
    title: "Giving Compass — Civic Engagement Grants",
  },
];

export async function scrape(ctx: ActionCtx) {
  let grantsFound = 0;
  let grantsAdded = 0;

  try {
    // Note: Giving Compass is a React SPA — fetch returns the shell HTML,
    // not rendered grant listings. We still store what we can find.
    const funderId = await ctx.runMutation(
      internal.scrapers.mutations.upsertFunder,
      {
        name: "Giving Compass",
        website: FUNDER_URL,
        faithAligned: true,
        acceptsUnsolicited: "unknown",
        requiresInvitation: false,
        notes:
          "Grant discovery aggregator. Requires browsing givingcompass.org/funds " +
          "with filters (Cause → Religion or Civic Engagement) to see current " +
          "opportunities. Site is JavaScript-rendered; full listings require a browser.",
      }
    );

    for (const page of PAGES) {
      let text = "";
      try {
        const res = await fetch(page.url, { headers: FETCH_HEADERS });
        if (res.ok) text = extractText(await res.text());
      } catch {
        text = "JavaScript-rendered page — browse manually for grant listings.";
      }

      const { amountMin, amountMax } = parseAmounts(text);
      const deadline = parseDeadline(text);

      const wasAdded = await ctx.runMutation(
        internal.scrapers.mutations.upsertGrant,
        {
          title: page.title,
          funderName: "Giving Compass",
          funderId,
          sourceUrl: page.url,
          funderUrl: FUNDER_URL,
          amountMin,
          amountMax,
          deadline,
          isRecurring: true,
          acceptsUnsolicited: "unknown",
          requiresLoi: false,
          rawText: truncate(
            text ||
              "Giving Compass is a JavaScript-rendered application. " +
                "Navigate to " +
                page.url +
                " in a browser to see current grant listings."
          ),
        }
      );
      grantsFound++;
      if (wasAdded) grantsAdded++;
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
