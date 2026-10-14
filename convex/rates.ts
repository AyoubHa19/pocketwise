import { ConvexError, v } from "convex/values";
import { rateProblem, type ExchangeRate } from "../src/lib/rates";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireOwner } from "./ownership";

function toRate(row: Doc<"exchangeRates">): ExchangeRate {
  return { id: row._id, from: row.from, to: row.to, rate: row.rate, date: row.date, source: row.source };
}

/** The signed-in user's exchange rates, oldest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireOwner(ctx);
    const rows = await ctx.db
      .query("exchangeRates")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();
    return rows.map(toRate);
  },
});

/**
 * Saves the rate for a pair of currencies, replacing the user's earlier
 * rate for that pair, whichever way round it was entered, so a pair never
 * has two rates that disagree. Returns its id.
 */
export const save = mutation({
  args: { from: v.string(), to: v.string(), rate: v.string(), date: v.string(), source: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const values = { ...args, rate: args.rate.trim(), source: args.source.trim() };
    const problem = rateProblem(values);
    if (problem) throw new ConvexError(problem);
    const rows = await ctx.db
      .query("exchangeRates")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();
    for (const row of rows) {
      const samePair =
        (row.from === values.from && row.to === values.to) || (row.from === values.to && row.to === values.from);
      if (samePair) await ctx.db.delete(row._id);
    }
    return await ctx.db.insert("exchangeRates", { ownerId, ...values, updatedAt: Date.now() });
  },
});

/** Deletes one of the user's rates. Converted figures that used it then say there's no rate. */
export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const id = ctx.db.normalizeId("exchangeRates", args.id);
    const row = id ? await ctx.db.get(id) : null;
    if (!row || row.ownerId !== ownerId) throw new ConvexError("That rate isn't one of yours.");
    await ctx.db.delete(row._id);
  },
});
