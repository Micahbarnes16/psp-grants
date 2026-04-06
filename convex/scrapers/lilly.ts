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

const SOURCE = "lillyendowment.org";
const FUNDER_URL = "https://lillyendowment.org";

const GRANT_PAGES = [
  {
    url: "https://lillyendowment.org/our-work/religion",
    title: "Lilly Endowment — Religion Grant Programs",
  },
  {
    url: "https://lillyendowment.org/exploring-practices",
    title: "Lilly Endowment — Exploring Practices of Ministry",
  },
];

export async function scrape(ctx: ActionCtx) {
  let grantsFound = 0;
  let grantsAdded = 0;

  try {
    const funderId = await ctx.runMutation(
      internal.scrapers.mutations.upsertFunder,
      {
        name: "Lilly Endowment Inc.",
        website: FUNDER_URL,
        faithAligned: true,
        acceptsUnsolicited: "no",
        requiresInvitation: true,
        notes:
          "One of the largest private foundations in the U.S. Most religion grants are " +
          "invitation-only or through competitive RFPs. Focus: pastoral leadership, " +
          "theological education, congregational vitality. Grants typically $100k–$2M+.",
      }
    );

    for (const page of GRANT_PAGES) {
      try {
        const res = await fetch(page.url, { headers: FETCH_HEADERS });
        if (!res.ok) continue;
        const html = await res.text();
        const text = extractText(html);
        const { amountMin, amountMax } = parseAmounts(text);
        const deadline = parseDeadline(text);

        const wasAdded = await ctx.runMutation(
          internal.scrapers.mutations.upsertGrant,
          {
            title: page.title,
            funderName: "Lilly Endowment Inc.",
            funderId,
            sourceUrl: page.url,
            funderUrl: FUNDER_URL,
            amountMin,
            amountMax,
            deadline,
            isRecurring: true,
            acceptsUnsolicited: "no",
            requiresLoi: false,
            rawText: truncate(text),
          }
        );

        grantsFound++;
        if (wasAdded) grantsAdded++;
      } catch {
        // single page failure — continue to next
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
