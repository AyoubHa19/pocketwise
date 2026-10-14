import { ConvexError, v } from "convex/values";
import { DAILY_SCAN_LIMIT } from "../src/lib/receipts";
import { internalMutation, mutation } from "./_generated/server";
import { requireOwner } from "./ownership";

// The parts of receipt scanning that don't call the model (that's
// receiptsNode.ts): the upload URL and the daily count.

/**
 * A one-time URL to upload a receipt image to, for signed-in users only.
 * The image is read by `receiptsNode.scan`, which deletes it afterwards.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Counts one scan for the user on `day` (UTC), refusing once they've
 * reached the daily limit. Called by the scan before it calls the model,
 * so a refused scan costs nothing.
 */
export const countScan = internalMutation({
  args: { ownerId: v.string(), day: v.string() },
  handler: async (ctx, { ownerId, day }) => {
    const row = await ctx.db
      .query("receiptScans")
      .withIndex("by_owner_day", (q) => q.eq("ownerId", ownerId).eq("day", day))
      .unique();
    const count = (row?.count ?? 0) + 1;
    if (count > DAILY_SCAN_LIMIT) {
      throw new ConvexError(`You can scan up to ${DAILY_SCAN_LIMIT} receipts a day. Add this one by hand, or try again tomorrow.`);
    }
    if (row) await ctx.db.patch(row._id, { count });
    else await ctx.db.insert("receiptScans", { ownerId, day, count });
    return count;
  },
});
