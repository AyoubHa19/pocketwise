import { v } from "convex/values";
import { DEFAULT_PREFERENCES, type Preferences } from "../src/lib/preferences";
import { mutation, query } from "./_generated/server";
import { requireOwner } from "./ownership";

// Display preferences live in the user's settings row, beside the currency
// and starting balance, but have their own functions: they change for
// different reasons, and saving one never touches the others.

/** The signed-in user's preferences, with defaults for anything unset. */
export const get = query({
  args: {},
  handler: async (ctx): Promise<Preferences> => {
    const ownerId = await requireOwner(ctx);
    const row = await ctx.db
      .query("settings")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .unique();
    return {
      theme: row?.theme ?? DEFAULT_PREFERENCES.theme,
      dateOrder: row?.dateOrder ?? DEFAULT_PREFERENCES.dateOrder,
    };
  },
});

/** Saves one or both preferences. The argument validators allow only known values. */
export const set = mutation({
  args: {
    theme: v.optional(v.union(v.literal("system"), v.literal("light"), v.literal("dark"))),
    dateOrder: v.optional(v.union(v.literal("month-first"), v.literal("day-first"))),
  },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const change: Partial<Preferences> = {};
    if (args.theme !== undefined) change.theme = args.theme;
    if (args.dateOrder !== undefined) change.dateOrder = args.dateOrder;
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
  },
});
