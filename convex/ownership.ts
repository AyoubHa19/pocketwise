import { ConvexError } from "convex/values";
import type { QueryCtx } from "./_generated/server";

/**
 * The signed-in user's id, for tagging and finding their records. Every
 * function that touches user data starts with this, so nothing is read or
 * written for someone who isn't signed in.
 *
 * It's the tokenIdentifier from the sign-in token, which Convex has checked
 * against our Clerk app (auth.config.ts). It's never taken from the
 * function's arguments, so a browser can't ask for someone else's data.
 */
export async function requireOwner(ctx: QueryCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new ConvexError("You need to be signed in.");
  }
  return identity.tokenIdentifier;
}
