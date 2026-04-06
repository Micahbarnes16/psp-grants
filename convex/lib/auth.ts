import { MutationCtx, QueryCtx, ActionCtx } from "../_generated/server";

const ALLOWED_EMAILS = new Set([
  "micahbarnes16@gmail.com",
  "miriambarnes98@gmail.com",
  "mattrbarnes98@gmail.com",
  "sarahrosebarnes@gmail.com",
]);

/**
 * Verifies the caller is authenticated AND in the email allowlist.
 * Throws if either check fails. Call this at the top of every
 * query, mutation, and action that touches user data.
 *
 * Returns the full identity so callers can use `tokenIdentifier`
 * for ownership checks without an extra ctx.auth call.
 */
export async function requireAllowedUser(
  ctx: QueryCtx | MutationCtx | ActionCtx
) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Unauthenticated");
  }

  if (!identity.email || !ALLOWED_EMAILS.has(identity.email)) {
    throw new Error("Unauthorized");
  }

  return identity;
}
