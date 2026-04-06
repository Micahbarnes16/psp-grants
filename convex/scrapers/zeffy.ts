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

const SOURCE = "zeffy.com";
const FUNDER_URL = "https://www.zeffy.com";
const GRANTS_URL =
  "https://www.zeffy.com/grants/religious-and-faith-based-organizations";

export async function scrape(ctx: ActionCtx) {
  let grantsFound = 0;
  let grantsAdded = 0;

  try {
    const funderId = await ctx.runMutation(
      internal.scrapers.mutations.upsertFunder,
      {
        name: "Zeffy Grants Directory",
        website: FUNDER_URL,
        faithAligned: true,
        acceptsUnsolicited: "unknown",
        requiresInvitation: false,
        notes:
          "Zeffy is a nonprofit fundraising platform that also curates a grant " +
          "directory. The faith-based grants page lists third-party grant opportunities. " +
          "Individual grant details link out to the actual funders' sites.",
      }
    );

    let text = "";
    let html = "";
    try {
      const res = await fetch(GRANTS_URL, { headers: FETCH_HEADERS });
      if (res.ok) {
        html = await res.text();
        text = extractText(html);
      }
    } catch {
      text = "";
    }

    // Store the directory page itself
    const { amountMin, amountMax } = parseAmounts(text);
    const deadline = parseDeadline(text);

    const wasAdded = await ctx.runMutation(
      internal.scrapers.mutations.upsertGrant,
      {
        title: "Zeffy — Religious & Faith-Based Organization Grants",
        funderName: "Zeffy Grants Directory",
        funderId,
        sourceUrl: GRANTS_URL,
        funderUrl: FUNDER_URL,
        amountMin,
        amountMax,
        deadline,
        isRecurring: true,
        acceptsUnsolicited: "unknown",
        requiresLoi: false,
        rawText: truncate(
          text ||
            "Zeffy grants page is JavaScript-rendered. " +
              "Visit " +
              GRANTS_URL +
              " in a browser to see listed grant opportunities."
        ),
      }
    );
    grantsFound++;
    if (wasAdded) grantsAdded++;

    // If the page has content, try to follow any external grant links found
    if (text.length > 500 && html) {
      const links = extractLinks(html).filter(
        (l) =>
          !l.href.includes("zeffy.com") &&
          l.href.startsWith("http") &&
          l.text.length > 8
      );

      for (const link of links.slice(0, 8)) {
        try {
          const linkRes = await fetch(link.href, { headers: FETCH_HEADERS });
          if (!linkRes.ok) continue;
          const linkText = extractText(await linkRes.text());
          const amounts = parseAmounts(linkText);
          const dl = parseDeadline(linkText);
          const domain = new URL(link.href).hostname.replace("www.", "");

          const added = await ctx.runMutation(
            internal.scrapers.mutations.upsertGrant,
            {
              title: link.text,
              funderName: domain,
              sourceUrl: link.href,
              funderUrl: `https://${domain}`,
              amountMin: amounts.amountMin,
              amountMax: amounts.amountMax,
              deadline: dl,
              isRecurring: true,
              acceptsUnsolicited: "unknown",
              rawText: truncate(linkText),
            }
          );
          grantsFound++;
          if (added) grantsAdded++;
        } catch {
          // skip inaccessible links
        }
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
