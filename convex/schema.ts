import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The data Pocketwise keeps on its server. It's the same shape the app
// already uses in the browser (src/lib/transactions.ts, settingsStore.ts),
// plus who owns each record and when it last changed.
//
// ownerId is the signed-in user's tokenIdentifier: Convex reads it from the
// sign-in token it has checked itself. It never comes from the browser, so
// no one can read or write someone else's data by sending another id.
export default defineSchema({
  // One row per user, created the first time they save a setting.
  settings: defineTable({
    ownerId: v.string(),
    currency: v.union(v.string(), v.null()),
    openingBalance: v.union(
      v.object({
        amountMinor: v.number(),
        currency: v.string(),
        date: v.string(),
      }),
      v.null(),
    ),
    // Display preferences (src/lib/preferences.ts). Optional because rows
    // saved before they existed don't have them; missing means the default.
    theme: v.optional(v.union(v.literal("system"), v.literal("light"), v.literal("dark"))),
    dateOrder: v.optional(v.union(v.literal("month-first"), v.literal("day-first"))),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  transactions: defineTable({
    ownerId: v.string(),
    // The id the app gave the transaction when it was created. Saving one
    // with the same clientId again updates it instead of adding a copy,
    // which also makes uploading local data safe to retry.
    clientId: v.string(),
    type: v.union(v.literal("income"), v.literal("expense")),
    // Whole minor units (cents), always positive; `type` gives the sign.
    amountMinor: v.number(),
    currency: v.string(),
    category: v.string(),
    // The calendar day, "YYYY-MM-DD", with no time zone.
    date: v.string(),
    note: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_owner_date", ["ownerId", "date"])
    .index("by_owner_clientId", ["ownerId", "clientId"]),
});
