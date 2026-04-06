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

const SOURCE = "crowelltrust.org";
const FUNDER_URL = "https://www.crowelltrust.org";

const PAGES = [
  {
    url: "https://www.crowelltrust.org/grants",
    title: "Crowell Trust — Grant Programs",
  },
  {
    url: "https://www.crowelltrust.org/selfscreening",
    title: "Crowell Trust — Eligibility Self-Screening",
  },
];

export async function scrape(ctx: ActionCtx) {
  let grantsFound = 0;
  let grantsAdded = 0;

  try {
    // Fetch both pages and combine for funder notes
    const texts: string[] = [];
    for (const page of PAGES) {
      try {
        const res = await fetch(page.url, { headers: FETCH_HEADERS });
        if (res.ok) texts.push(extractText(await res.text()));
      } catch {
        // continue
      }
    }

    const combinedText = texts.join("\n");

    const funderId = await ctx.runMutation(
      internal.scrapers.mutations.upsertFunder,
      {
        name: "Crowell Trust",
        website: FUNDER_URL,
        faithAligned: true,
        acceptsUnsolicited: "yes",
        requiresInvitation: false,
        notes:
          "Supports Christian and faith-based organizations. " +
          "Complete self-screening at crowelltrust.org/selfscreening before applying.",
      }
    );

    for (let i = 0; i < PAGES.length; i++) {
      const text = texts[i];
      if (!text) continue;

      const { amountMin, amountMax } = parseAmounts(text);
      const deadline = parseDeadline(text);

      const wasAdded = await ctx.runMutation(
        internal.scrapers.mutations.upsertGrant,
        {
          title: PAGES[i].title,
          funderName: "Crowell Trust",
          funderId,
          sourceUrl: PAGES[i].url,
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
