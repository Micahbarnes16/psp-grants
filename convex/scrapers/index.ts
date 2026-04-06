"use node";

import { internalAction, action } from "../_generated/server";
import { v } from "convex/values";

// Import the raw scrape functions — all are "use node", same runtime.
// Calling them directly avoids cross-action overhead per Convex guidelines.
import { scrape as scrapeChatlos } from "./chatlos";
import { scrape as scrapeLilly } from "./lilly";
import { scrape as scrapeCrowell } from "./crowell";
import { scrape as scrapeEvangelism } from "./evangelism";
import { scrape as scrapeNcf } from "./ncf";
import { scrape as scrapeStewardship } from "./stewardship";
import { scrape as scrapeGivingCompass } from "./givingcompass";
import { scrape as scrapeGrantWatch } from "./grantwatch";
import { scrape as scrapeZeffy } from "./zeffy";

type ScraperFn = (ctx: Parameters<typeof scrapeChatlos>[0]) => Promise<{
  source: string;
  grantsFound: number;
  grantsAdded: number;
  error?: string;
}>;

const SCRAPERS: ScraperFn[] = [
  scrapeChatlos,
  scrapeLilly,
  scrapeCrowell,
  scrapeEvangelism,
  scrapeNcf,
  scrapeStewardship,
  scrapeGivingCompass,
  scrapeGrantWatch,
  scrapeZeffy,
];

async function runAll(ctx: Parameters<typeof scrapeChatlos>[0]) {
  const results = [];

  for (const scraper of SCRAPERS) {
    try {
      const result = await scraper(ctx);
      results.push(result);
      console.log(
        `[scraper] ${result.source}: found=${result.grantsFound} added=${result.grantsAdded}` +
          (result.error ? ` error=${result.error}` : "")
      );
    } catch (err) {
      // Should not reach here — each scraper handles its own errors internally.
      console.error(`[scraper] Unhandled error:`, err);
      results.push({
        source: "unknown",
        grantsFound: 0,
        grantsAdded: 0,
        error: String(err),
      });
    }
  }

  const totals = results.reduce(
    (acc, r) => ({
      grantsFound: acc.grantsFound + r.grantsFound,
      grantsAdded: acc.grantsAdded + r.grantsAdded,
    }),
    { grantsFound: 0, grantsAdded: 0 }
  );

  console.log(
    `[scraper] Run complete — total found: ${totals.grantsFound}, total added: ${totals.grantsAdded}`
  );

  return { results, totals };
}

/** Internal action — called by cron. */
export const runAllScrapers = internalAction({
  args: {},
  handler: (ctx) => runAll(ctx),
});

/** Public action — allows manual triggering via `npx convex run`. */
export const runAllScrapersManual = action({
  args: {},
  handler: (ctx) => runAll(ctx),
});
