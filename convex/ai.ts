"use node";

import { action, internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireAllowedUser } from "./lib/auth";
import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const GEO_LABELS: Record<string, string> = {
  indiana_only: "Indiana Only",
  midwest: "Midwest",
  all_50_states: "All 50 States",
  national_international: "National + International",
};

const BUDGET_LABELS: Record<string, string> = {
  under_100k: "Under $100,000",
  "100k_500k": "$100,000 – $500,000",
  "500k_1m": "$500,000 – $1M",
  "1m_5m": "$1M – $5M",
  over_5m: "Over $5M",
};

function fmtAmount(min?: number, max?: number): string {
  if (!min && !max) return "Not specified";
  const fmt = (n: number) =>
    n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  if (min && max && min !== max) return `${fmt(min)} – ${fmt(max)}`;
  if (max) return `Up to ${fmt(max)}`;
  return `${fmt(min!)}+`;
}

function fmtDate(ts?: number): string {
  if (!ts) return "Not specified";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function orgBlock(profile: Record<string, unknown> | null): string {
  return `## Organization Profile
- Name: ${profile?.name ?? "Public Servants' Prayer Inc"}
- EIN: ${profile?.ein ?? "82-2232515"}
- Mission: ${profile?.mission ?? "We provide prayer and pastoral care in the political arena."}
- Primary Programs: ${profile?.primaryPrograms ?? "Weekly Bible studies for the capitol community, weekly prayer times, career coaching and discipleship, personal counseling, daily evangelistic opportunities, funerals and weddings, annual Statehouse Prayer Services, Women's Statehouse Days, Pastors' Statehouse Days, biweekly Bagels and Books events, birthday card program for legislators."}
- Geographic Scope: ${profile?.geographicScope ? (GEO_LABELS[profile.geographicScope as string] ?? profile.geographicScope) : "All 50 States"}
- Annual Budget: ${profile?.annualBudget ? (BUDGET_LABELS[profile.annualBudget as string] ?? profile.annualBudget) : "$100,000 – $500,000"}
- Founded: ${profile?.foundedYear ?? 2004}
- Website: ${profile?.website ?? "https://thepsp.org"}
- Focus Areas: ${(profile?.focusAreas as string[] | undefined)?.join(", ") ?? "evangelism, discipleship, prayer, pastoral care, civic engagement, legislative outreach"}`;
}

function grantBlock(grant: Record<string, unknown>): string {
  return `## Grant Being Evaluated
- Title: ${grant.title}
- Funder: ${grant.funderName}
- Amount Range: ${fmtAmount(grant.amountMin as number | undefined, grant.amountMax as number | undefined)}
- Deadline: ${fmtDate(grant.deadline as number | undefined)}
- Accepts Unsolicited Applications: ${grant.acceptsUnsolicited ?? "unknown"}
- Requires LOI: ${grant.requiresLoi !== undefined ? (grant.requiresLoi ? "Yes" : "No") : "Unknown"}
- URL: ${grant.sourceUrl ?? grant.url ?? "Not provided"}
- Description: ${((grant.description as string | undefined) ?? (grant.rawText as string | undefined) ?? "No description available").slice(0, 3000)}`;
}

const PSP_CONTEXT = `## PSP's Current Funding Needs
1. Women's Ministry — $100,000 budget
2. Project 1816 (equipping pastors for local government ministry) — $100,000
3. Website Growth and Maintenance — $40,000
4. Internships — $20,000

## PSP's Grant History & Relationships
- Has received grants before
- Existing relationships: National Christian Foundation, Indiana Christian Foundation, Jackson Family Foundation
- Preferences: non-partisan, non-political, minimum $5,000 grant size`;

// ---------------------------------------------------------------------------
// Core analysis logic — shared between public and internal actions
// ---------------------------------------------------------------------------
async function runAnalysis(
  ctx: ActionCtx,
  grantId: Id<"grants">,
  tokenIdentifier: string
): Promise<void> {
  const context = await ctx.runQuery(internal.grants.fetchGrantContext, {
    grantId,
    tokenIdentifier,
  });
  if (!context) {
    console.warn(`[analyzeGrant] Grant ${grantId} not found — skipping.`);
    return;
  }
  const { grant, profile } = context;

  const prompt = `You are a grant analysis assistant for a nonprofit organization.

${orgBlock(profile as Record<string, unknown> | null)}

${PSP_CONTEXT}

${grantBlock(grant as Record<string, unknown>)}

## Instructions
Analyze how well this grant fits the organization's mission, programs, and funding needs. Consider faith-alignment, program match, geographic scope, grant size, and organizational capacity.

Return ONLY valid JSON with no other text, markdown, or code fences:

{
  "alignmentScore": <integer 0-100>,
  "summary": "<2-3 sentence plain English summary of the opportunity and its fit for PSP>",
  "pros": ["<reason this is a good fit>"],
  "cons": ["<concern or reason it might not fit>"],
  "recommendedFundingNeed": "<exactly one of: Women's Ministry | Project 1816 | Website Growth and Maintenance | Internships | general operations>",
  "suggestedApproach": "<2-3 sentences of advice on how to approach the application>"
}`;

  let result = {
    alignmentScore: 0,
    summary: "Analysis failed — please try again.",
    pros: [] as string[],
    cons: [] as string[],
    recommendedFundingNeed: "general operations",
    suggestedApproach: "",
  };

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in Claude response");
    const parsed = JSON.parse(jsonMatch[0]);

    result = {
      alignmentScore: Number(parsed.alignmentScore ?? 0),
      summary: String(parsed.summary ?? ""),
      pros: Array.isArray(parsed.pros) ? parsed.pros.map(String) : [],
      cons: Array.isArray(parsed.cons) ? parsed.cons.map(String) : [],
      recommendedFundingNeed: String(
        parsed.recommendedFundingNeed ?? "general operations"
      ),
      suggestedApproach: String(parsed.suggestedApproach ?? ""),
    };
  } catch (err) {
    result.summary = `Analysis failed: ${err instanceof Error ? err.message : "unknown error"}`;
    console.error(`[analyzeGrant] Error analyzing grant ${grantId}:`, err);
  }

  await ctx.runMutation(internal.grants.storeAnalysisResult, {
    grantId,
    tokenIdentifier,
    ...result,
    content: JSON.stringify(result),
  });
}

// ---------------------------------------------------------------------------
// analyzeGrant — public, called from UI with authenticated user
// ---------------------------------------------------------------------------
export const analyzeGrant = action({
  args: { grantId: v.id("grants") },
  handler: async (ctx, { grantId }) => {
    const identity = await requireAllowedUser(ctx);
    await runAnalysis(ctx, grantId, identity.tokenIdentifier);
  },
});

// ---------------------------------------------------------------------------
// analyzeGrantInternal — internal, scheduled by scraper pipeline (no auth)
// Falls back to hardcoded PSP profile data when no profile exists.
// ---------------------------------------------------------------------------
export const analyzeGrantInternal = internalAction({
  args: { grantId: v.id("grants") },
  handler: async (ctx, { grantId }) => {
    // Use "" as tokenIdentifier → fetchGrantContext returns profile: null
    // → orgBlock falls back to hardcoded PSP data. Store with "system" token.
    await runAnalysis(ctx, grantId, "system");
  },
});

// ---------------------------------------------------------------------------
// generateDraft — produce a draft LOI / grant application letter
// ---------------------------------------------------------------------------
export const generateDraft = action({
  args: { grantId: v.id("grants") },
  handler: async (ctx, { grantId }) => {
    const identity = await requireAllowedUser(ctx);

    const context = await ctx.runQuery(internal.grants.fetchGrantContext, {
      grantId,
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!context) throw new Error("Grant not found");
    const { grant, profile, analysis } = context;

    const analysisSection = analysis
      ? `## Prior AI Analysis
- Alignment Score: ${analysis.alignmentScore ?? "N/A"}/100
- Recommended Funding Need: ${analysis.recommendedFundingNeed ?? "general operations"}
- Summary: ${analysis.summary ?? ""}
- Suggested Approach: ${analysis.suggestedApproach ?? ""}`
      : "";

    const prompt = `You are a grant writing assistant for a nonprofit organization.

${orgBlock(profile as Record<string, unknown> | null)}

${PSP_CONTEXT}

${grantBlock(grant as Record<string, unknown>)}

${analysisSection}

## Instructions
Write a compelling Letter of Intent (LOI) or grant application letter for this opportunity.

The letter should:
1. Be addressed appropriately (use "Dear Selection Committee" if no specific contact is known)
2. Open with a compelling statement of need aligned with the organization's mission
3. Describe the specific program that best matches this grant (${analysis?.recommendedFundingNeed ?? "general operations"})
4. Include specific program details, expected outcomes, and budget information
5. Reference the organization's track record and existing funder relationships where relevant
6. Close with a clear, specific ask and next steps
7. Be professional, faith-appropriate, and non-partisan in tone
8. Be approximately 500-800 words

Write the complete letter, ready to submit with minimal editing. Do not include any commentary before or after the letter.`;

    let draftContent = "Draft generation failed — please try again.";

    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

      const client = new Anthropic({ apiKey });
      const message = await client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });

      draftContent =
        message.content[0].type === "text"
          ? message.content[0].text
          : "Draft generation failed — unexpected response format.";
    } catch (err) {
      draftContent = `Draft generation failed: ${err instanceof Error ? err.message : "unknown error"}`;
      console.error(`[generateDraft] Error for grant ${grantId}:`, err);
    }

    await ctx.runMutation(internal.grants.storeDraftContent, {
      grantId,
      tokenIdentifier: identity.tokenIdentifier,
      draftContent,
    });
  },
});
