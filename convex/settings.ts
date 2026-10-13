import { v } from "convex/values";
import type { OpeningBalance } from "../src/lib/summary";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireOwner } from "./ownership";
import { checkCurrency, checkOpeningBalance } from "./validation";

// The same shape as the app's Settings (src/lib/settingsStore.ts). Written
// out here because that file is browser code, which the server can't load.
export type Settings = {
  currency: string | null;
  openingBalance: OpeningBalance | null;
};

/** The signed-in user's settings; nothing chosen yet until they save some. */
export const get = query({
  args: {},
  handler: async (ctx): Promise<Settings> => {
    const ownerId = await requireOwner(ctx);
    const row = await ctx.db
      .query("settings")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .unique();
    return {
      currency: row?.currency ?? null,
      openingBalance: row?.openingBalance ?? null,
    };
  },
});

/** Saves part of the user's settings, creating their row the first time. */
async function saveSettings(ctx: MutationCtx, ownerId: string, change: Partial<Settings>) {
  const row = await ctx.db
    .query("settings")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .unique();
  const updatedAt = Date.now();
  if (row) {
    await ctx.db.patch(row._id, { ...change, updatedAt });
  } else {
    await ctx.db.insert("settings", {
      ownerId,
      currency: null,
      openingBalance: null,
      ...change,
      updatedAt,
    });
  }
}

export const setCurrency = mutation({
  args: { currency: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    await saveSettings(ctx, ownerId, { currency: checkCurrency(args.currency) });
  },
});

/** Sets the starting balance, or removes it with null. */
export const setOpeningBalance = mutation({
  args: {
    openingBalance: v.union(
      v.object({ amountMinor: v.number(), currency: v.string(), date: v.string() }),
      v.null(),
    ),
  },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const openingBalance =
      args.openingBalance === null ? null : checkOpeningBalance(args.openingBalance);
    await saveSettings(ctx, ownerId, { openingBalance });
  },
});
