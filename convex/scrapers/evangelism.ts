"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import {
  extractText,
  parseAmounts,
  parseDeadline,
  extractLinks,
  truncate,
  FETCH_HEADERS,
} from "./parseUtils";

const SOURCE = "foundationforevangelism.org";
const FUNDER_URL = "https://www.foundationforevangelism.org";
const GRANTS_URL = "https://www.foundationforevangelism.org/grants";

export async function scrape(ctx: ActionCtx) {
  let grantsFound = 0;
  let grantsAdded = 0;

  try {
    const res = await fetch(GRANTS_URL, { headers: FETCH_HEADERS });
    const html = res.ok ? await res.text() : "";
    const text = extractText(html);

    // Look for individual grant program links on the grants page
    const links = extractLinks(html).filter(
      (l) =>
        l.href.includes("foundationforevangelism.org") &&
        !l.href.endsWith("/grants") &&
        l.text.length > 5
    );

    const funderId = await ctx.runMutation(
      internal.scrapers.mutations.upsertFunder,
      {
        name: "Foundation for Evangelism",
        website: FUNDER_URL,
        faithAligned: true,
        acceptsUnsolicited: "yes",
        requiresInvitation: false,
        notes:
          "United Methodist-affiliated foundation. Focuses on evangelism, " +
          "outreach, and discipleship ministries. Preference for United Methodist " +
          "organizations but not exclusive.",
      }
    );

    // Always store the grants index page
    const { amountMin, amountMax } = parseAmounts(text);
    const deadline = parseDeadline(text);

    const wasAdded = await ctx.runMutation(
      internal.scrapers.mutations.upsertGrant,
      {
        title: "Foundation for Evangelism — Grant Programs",
        funderName: "Foundation for Evangelism",
        funderId,
        sourceUrl: GRANTS_URL,
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

    // Fetch any individual grant program pages found
    for (const link of links.slice(0, 5)) {
      try {
        const linkRes = await fetch(link.href, { headers: FETCH_HEADERS });
        if (!linkRes.ok) continue;
        const linkHtml = await linkRes.text();
        const linkText = extractText(linkHtml);
        const amounts = parseAmounts(linkText);
        const dl = parseDeadline(linkText);

        const added = await ctx.runMutation(
          internal.scrapers.mutations.upsertGrant,
          {
            title: `Foundation for Evangelism — ${link.text}`,
            funderName: "Foundation for Evangelism",
            funderId,
            sourceUrl: link.href,
            funderUrl: FUNDER_URL,
            amountMin: amounts.amountMin,
            amountMax: amounts.amountMax,
            deadline: dl,
            isRecurring: true,
            acceptsUnsolicited: "yes",
            requiresLoi: false,
            rawText: truncate(linkText),
          }
        );
        grantsFound++;
        if (added) grantsAdded++;
      } catch {
        // skip this link
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
