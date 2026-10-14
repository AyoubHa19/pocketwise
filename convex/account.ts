import { mutation } from "./_generated/server";
import { requireOwner } from "./ownership";

/** How many records one call deletes; the app calls again while `more`. */
const DELETE_BATCH_SIZE = 500;

/**
 * Deletes the signed-in user's data: their transactions, then their
 * budgets, accounts, categories and settings. Only ever their own, found by the
 * owner from the sign-in token. A large account is deleted over several
 * calls, so no single call runs into Convex's per-request limits; `more`
 * says whether to call again.
 */
export const deleteMyData = mutation({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireOwner(ctx);
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_owner_date", (q) => q.eq("ownerId", ownerId))
      .take(DELETE_BATCH_SIZE);
    for (const row of transactions) await ctx.db.delete(row._id);
    if (transactions.length === DELETE_BATCH_SIZE) {
      return { deleted: transactions.length, more: true };
    }
    // Then budgets, the money accounts and categories (the transactions and
    // budgets pointed to them), and settings last, so a half-finished deletion still shows the
    // account as set up, rather than as a new one with old transactions.
    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();
    for (const row of budgets) await ctx.db.delete(row._id);
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();
    for (const row of accounts) await ctx.db.delete(row._id);
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();
    for (const row of categories) await ctx.db.delete(row._id);
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .unique();
    if (settings) await ctx.db.delete(settings._id);
    return { deleted: transactions.length, more: false };
  },
});
