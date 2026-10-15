import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/** The pictures a user can choose (AVATARS in src/lib/preferences.ts). */
export const avatarValidator = v.union(
  v.literal("a1"),
  v.literal("a2"),
  v.literal("a3"),
  v.literal("a4"),
  v.literal("a5"),
  v.literal("a6"),
  v.literal("a7"),
  v.literal("a8"),
);

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
    dateOrder: v.optional(
      v.union(v.literal("day-first"), v.literal("month-first"), v.literal("numeric")),
    ),
    weekStart: v.optional(v.union(v.literal("monday"), v.literal("sunday"), v.literal("saturday"))),
    // The chosen picture (AVATARS); null when it was taken away.
    avatar: v.optional(v.union(avatarValidator, v.null())),
    // Set once openingBalance has been copied into an account (accounts.ts
    // ensureAccounts), so it's never copied twice.
    openingMoved: v.optional(v.boolean()),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  // The user's categories (src/lib/categories.ts). A name is unique among
  // the user's categories of its kind, ignoring case and spaces.
  categories: defineTable({
    ownerId: v.string(),
    name: v.string(),
    kind: v.union(v.literal("expense"), v.literal("income")),
    archived: v.boolean(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  // Monthly spending limits (src/lib/budgets.ts has the rules). At most one
  // per category, or for all spending (no categoryId), in each currency.
  budgets: defineTable({
    ownerId: v.string(),
    name: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    limitMinor: v.number(),
    currency: v.string(),
    warnPercent: v.number(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  // Savings goals (src/lib/goals.ts). A goal follows an account's balance
  // (accountId) or adds up its own entries in goalContributions.
  goals: defineTable({
    ownerId: v.string(),
    name: v.string(),
    targetMinor: v.number(),
    // Fixed once the goal is made: its entries are in this currency.
    currency: v.string(),
    targetDate: v.optional(v.string()),
    accountId: v.optional(v.id("accounts")),
    archived: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    // Finds the goals that follow an account, when it's deleted.
    .index("by_owner_account", ["ownerId", "accountId"]),

  // A goal's own record: money noted as put aside (above zero) or taken
  // back out (below). Not transactions, so never income or spending.
  goalContributions: defineTable({
    ownerId: v.string(),
    goalId: v.id("goals"),
    amountMinor: v.number(),
    date: v.string(),
    note: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_goal", ["goalId"]),

  // Recurring transactions and bills (src/lib/recurring.ts). A rule never
  // adds a transaction by itself: the user records each occurrence.
  recurringRules: defineTable({
    ownerId: v.string(),
    name: v.string(),
    type: v.union(v.literal("income"), v.literal("expense")),
    amountMinor: v.number(),
    currency: v.string(),
    categoryId: v.id("categories"),
    accountId: v.optional(v.id("accounts")),
    frequency: v.union(
      v.literal("weekly"),
      v.literal("biweekly"),
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("yearly"),
    ),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    trackFrom: v.string(),
    paused: v.boolean(),
    remindDays: v.number(),
    skipped: v.array(v.string()),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  // Exchange rates the user entered (src/lib/rates.ts): one per pair of
  // currencies, whichever way round.
  exchangeRates: defineTable({
    ownerId: v.string(),
    from: v.string(),
    to: v.string(),
    // The decimal as typed ("4.2815"), so no precision is lost.
    rate: v.string(),
    date: v.string(),
    source: v.string(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  // How many receipts each user scanned each day, to cap the cost
  // (DAILY_SCAN_LIMIT in src/lib/receipts.ts). The images themselves are
  // deleted as soon as they've been read.
  receiptScans: defineTable({
    ownerId: v.string(),
    day: v.string(),
    count: v.number(),
  }).index("by_owner_day", ["ownerId", "day"]),

  // The safe-to-spend plan's settings (src/lib/plan.ts), one row per user.
  plans: defineTable({
    ownerId: v.string(),
    reserveMinor: v.number(),
    savingsMinor: v.number(),
    // Missing means every open account in the main currency.
    accountIds: v.optional(v.array(v.id("accounts"))),
    salaryRuleId: v.optional(v.id("recurringRules")),
    payday: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  // Debts and installments, tracked by hand (src/lib/debts.ts). Payments
  // are ordinary transactions, found by id; the balance is the user's own.
  debts: defineTable({
    ownerId: v.string(),
    name: v.string(),
    currency: v.string(),
    balanceMinor: v.number(),
    balanceDate: v.string(),
    paymentMinor: v.number(),
    frequency: v.union(
      v.literal("weekly"),
      v.literal("biweekly"),
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("yearly"),
    ),
    nextDue: v.optional(v.string()),
    // As typed ("12.5"); missing when the user doesn't know it.
    annualRate: v.optional(v.string()),
    originalMinor: v.optional(v.number()),
    ruleId: v.optional(v.id("recurringRules")),
    archived: v.boolean(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  // The user's money accounts (src/lib/accounts.ts).
  accounts: defineTable({
    ownerId: v.string(),
    name: v.string(),
    type: v.union(
      v.literal("cash"),
      v.literal("bank"),
      v.literal("savings"),
      v.literal("wallet"),
      v.literal("other"),
    ),
    currency: v.string(),
    // null until the user gives a starting balance.
    opening: v.union(v.object({ amountMinor: v.number(), date: v.string() }), v.null()),
    archived: v.boolean(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  transactions: defineTable({
    ownerId: v.string(),
    // The id the app gave the transaction when it was created. Saving one
    // with the same clientId again updates it instead of adding a copy,
    // which also makes uploading local data safe to retry.
    clientId: v.string(),
    // A transfer moves money between two of the user's own accounts.
    type: v.union(v.literal("income"), v.literal("expense"), v.literal("transfer")),
    // Where it happened (for a transfer, where the money left). Optional
    // only for transactions from before accounts, until ensureAccounts
    // assigns them.
    accountId: v.optional(v.id("accounts")),
    // A transfer's destination.
    toAccountId: v.optional(v.id("accounts")),
    // The category, by id, so a rename shows everywhere. `category` below
    // keeps the name too: it's all that transactions from before categories
    // had, until ensureCategories links them.
    categoryId: v.optional(v.id("categories")),
    // Whole minor units (cents), always positive; `type` gives the sign.
    amountMinor: v.number(),
    currency: v.string(),
    category: v.string(),
    // The calendar day, "YYYY-MM-DD", with no time zone.
    date: v.string(),
    // Who was paid, or what it was (src/lib/tags.ts has the limits).
    description: v.optional(v.string()),
    note: v.optional(v.string()),
    // Missing when there are none.
    tags: v.optional(v.array(v.string())),
    updatedAt: v.number(),
  })
    .index("by_owner_date", ["ownerId", "date"])
    .index("by_owner_clientId", ["ownerId", "clientId"])
    // Finds what's left to assign to an account, and what's in an account.
    .index("by_owner_account", ["ownerId", "accountId"])
    // Finds transfers into an account.
    .index("by_owner_toAccount", ["ownerId", "toAccountId"])
    // Finds income and spending left to link to a category (transfers
    // never have one, so they're kept out by type).
    .index("by_owner_type_category", ["ownerId", "type", "categoryId"]),
});
