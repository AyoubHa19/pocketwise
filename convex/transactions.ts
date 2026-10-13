import { v } from "convex/values";
import type { Transaction } from "../src/lib/transactions";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireOwner } from "./ownership";
import { checkTransaction } from "./validation";

// A transaction as the app knows it (src/lib/transactions.ts). Convex checks
// this shape before the function even runs; checkTransaction checks the
// values.
const transactionArg = v.object({
  id: v.string(),
  type: v.union(v.literal("income"), v.literal("expense")),
  amount: v.object({ amountMinor: v.number(), currency: v.string() }),
  category: v.string(),
  date: v.string(),
  note: v.optional(v.string()),
});

/** A stored row back in the shape the app uses, without server-only fields. */
function toTransaction(row: Doc<"transactions">): Transaction {
  return {
    id: row.clientId,
    type: row.type,
    amount: { amountMinor: row.amountMinor, currency: row.currency },
    category: row.category,
    date: row.date,
    ...(row.note !== undefined && { note: row.note }),
  };
}

/** The signed-in user's transactions: newest day first, newest first within a day. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireOwner(ctx);
    const rows = await ctx.db
      .query("transactions")
      .withIndex("by_owner_date", (q) => q.eq("ownerId", ownerId))
      .order("desc")
      .collect();
    return rows.map(toTransaction);
  },
});

/**
 * Adds a transaction, or updates the one with the same id. Only ever the
 * signed-in user's own: the id is looked up among their transactions, so
 * another user's transaction can't be overwritten, even with its id.
 */
export const save = mutation({
  args: { transaction: transactionArg },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const t = checkTransaction(args.transaction);
    const fields = {
      type: t.type,
      amountMinor: t.amount.amountMinor,
      currency: t.amount.currency,
      category: t.category,
      date: t.date,
      note: t.note?.trim() || undefined,
      updatedAt: Date.now(),
    };
    const existing = await ctx.db
      .query("transactions")
      .withIndex("by_owner_clientId", (q) =>
        q.eq("ownerId", ownerId).eq("clientId", t.id),
      )
      .unique();
    if (existing) {
      // replace, not patch, so a removed note really goes away.
      await ctx.db.replace(existing._id, { ownerId, clientId: t.id, ...fields });
    } else {
      await ctx.db.insert("transactions", { ownerId, clientId: t.id, ...fields });
    }
  },
});

/** Deletes one of the signed-in user's transactions. False if there was none. */
export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const existing = await ctx.db
      .query("transactions")
      .withIndex("by_owner_clientId", (q) =>
        q.eq("ownerId", ownerId).eq("clientId", args.id),
      )
      .unique();
    if (!existing) return false;
    await ctx.db.delete(existing._id);
    return true;
  },
});
