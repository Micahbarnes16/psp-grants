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

const SOURCE = "chatlos.org";
const FUNDER_URL = "https://www.chatlos.org";
const PAGES = [
  "https://www.chatlos.org/information-for-applicants",
  "https://www.chatlos.org/the-application-process",
];

export async function scrape(ctx: ActionCtx) {
  let grantsFound = 0;
  let grantsAdded = 0;

  try {
    const htmlParts: string[] = [];
    for (const url of PAGES) {
      try {
        const res = await fetch(url, { headers: FETCH_HEADERS });
        if (res.ok) htmlParts.push(await res.text());
      } catch {
        // page unavailable — continue
      }
    }

    const combined = htmlParts.join("\n");
    const text = extractText(combined);
    const { amountMin, amountMax } = parseAmounts(text);
    const deadline = parseDeadline(text);

    const funderId = await ctx.runMutation(
      internal.scrapers.mutations.upsertFunder,
      {
        name: "The Chatlos Foundation",
        website: FUNDER_URL,
        faithAligned: true,
        acceptsUnsolicited: "yes",
        requiresInvitation: false,
        notes:
          "Supports religious, educational, medical, and liberal arts organizations. " +
          "No online application — written letter of inquiry required. " +
          "Typically gives $5,000–$25,000.",
      }
    );

    // Chatlos funds evangelism, Christian education, and healthcare broadly.
    // Treat the two information pages as a single grant opportunity record.
    const wasAdded = await ctx.runMutation(
      internal.scrapers.mutations.upsertGrant,
      {
        title: "Chatlos Foundation General Grants",
        funderName: "The Chatlos Foundation",
        funderId,
        sourceUrl: PAGES[0],
        funderUrl: FUNDER_URL,
        amountMin: amountMin ?? 5_000,
        amountMax: amountMax ?? 25_000,
        deadline,
        isRecurring: true,
        acceptsUnsolicited: "yes",
        requiresLoi: true,
        rawText: truncate(text),
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
