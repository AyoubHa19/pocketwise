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

/**
 * Moves settings saved in the browser into the account, filling in only
 * what the account doesn't have yet: a currency or balance already chosen
 * in the account is kept. Returns what was filled in.
 */
export const importLocal = mutation({
  args: {
    currency: v.union(v.string(), v.null()),
    openingBalance: v.union(
      v.object({ amountMinor: v.number(), currency: v.string(), date: v.string() }),
      v.null(),
    ),
  },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    // Check both before writing either.
    const currency = args.currency === null ? null : checkCurrency(args.currency);
    const openingBalance =
      args.openingBalance === null ? null : checkOpeningBalance(args.openingBalance);
    const row = await ctx.db
      .query("settings")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .unique();
    const change: Partial<Settings> = {};
    if (currency !== null && !row?.currency) change.currency = currency;
    if (openingBalance !== null && !row?.openingBalance) change.openingBalance = openingBalance;
    if (Object.keys(change).length > 0) await saveSettings(ctx, ownerId, change);
    return { currency: "currency" in change, openingBalance: "openingBalance" in change };
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
