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

const SOURCE = "grantwatch.com";
const FUNDER_URL = "https://www.grantwatch.com";

// GrantWatch public-facing category pages (full listings require subscription)
const PAGES = [
  {
    url: "https://www.grantwatch.com/cat/45/religion-grants.html",
    title: "GrantWatch — Religion & Faith Grants",
  },
  {
    url: "https://www.grantwatch.com/cat/45/faith-based-nonprofit-grants.html",
    title: "GrantWatch — Faith-Based Nonprofit Grants",
  },
];

export async function scrape(ctx: ActionCtx) {
  let grantsFound = 0;
  let grantsAdded = 0;

  try {
    const funderId = await ctx.runMutation(
      internal.scrapers.mutations.upsertFunder,
      {
        name: "GrantWatch",
        website: FUNDER_URL,
        faithAligned: false,
        acceptsUnsolicited: "unknown",
        requiresInvitation: false,
        notes:
          "Grant aggregator/database. Full listings require paid subscription. " +
          "Faith category URL: grantwatch.com/cat/45/religion-grants.html. " +
          "Register at grantwatch.com for free limited access.",
      }
    );

    for (const page of PAGES) {
      let text = "";
      try {
        const res = await fetch(page.url, {
          headers: {
            ...FETCH_HEADERS,
            // GrantWatch sometimes blocks bots; try with a referrer
            Referer: "https://www.google.com/",
          },
        });
        if (res.ok) text = extractText(await res.text());
      } catch {
        text = "";
      }

      const { amountMin, amountMax } = parseAmounts(text);
      const deadline = parseDeadline(text);

      const wasAdded = await ctx.runMutation(
        internal.scrapers.mutations.upsertGrant,
        {
          title: page.title,
          funderName: "GrantWatch",
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
              "GrantWatch requires a subscription for full listings. " +
                "Visit " +
                page.url +
                " to browse available faith-based grants."
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
