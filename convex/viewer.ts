import { query } from "./_generated/server";

/**
 * Who is signed in, as Convex sees it, or null when no one is. It proves the
 * whole chain works: Clerk signs the user in, the browser sends Clerk's
 * token, and Convex checks that token itself (see auth.config.ts) before
 * trusting it. Nothing here comes from what the browser claims.
 *
 * It returns only what the Settings page shows, no financial data.
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) return null;
    return {
      name: identity.name ?? null,
      email: identity.email ?? null,
    };
  },
});
