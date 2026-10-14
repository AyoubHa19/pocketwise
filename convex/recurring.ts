import { ConvexError, v } from "convex/values";
import { occurrencesBetween, ruleProblem, type RecurringRule } from "../src/lib/recurring";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { requireOwner } from "./ownership";
import { checkCurrency, isCalendarDate } from "./validation";

const frequencyArg = v.union(
  v.literal("weekly"),
  v.literal("biweekly"),
  v.literal("monthly"),
  v.literal("quarterly"),
  v.literal("yearly"),
);

const ruleArgs = {
  name: v.string(),
  type: v.union(v.literal("income"), v.literal("expense")),
  amountMinor: v.number(),
  currency: v.string(),
  categoryId: v.string(),
  accountId: v.union(v.string(), v.null()),
  frequency: frequencyArg,
  startDate: v.string(),
  endDate: v.union(v.string(), v.null()),
  remindDays: v.number(),
  /** The user's own date today ("YYYY-MM-DD"), which the server can't know. */
  today: v.string(),
};

/** A rule's values as the functions receive them, without `today`. */
type RuleValues = {
  name: string;
  type: "income" | "expense";
  amountMinor: number;
  currency: string;
  categoryId: string;
  accountId: string | null;
  frequency: RecurringRule["frequency"];
  startDate: string;
  endDate: string | null;
  remindDays: number;
};

/** A stored rule in the shape the app uses. */
function toRule(row: Doc<"recurringRules">): RecurringRule {
  return {
    id: row._id,
    name: row.name,
    type: row.type,
    amount: { amountMinor: row.amountMinor, currency: row.currency },
    categoryId: row.categoryId,
    accountId: row.accountId ?? null,
    frequency: row.frequency,
    startDate: row.startDate,
    endDate: row.endDate ?? null,
    trackFrom: row.trackFrom,
    paused: row.paused,
    remindDays: row.remindDays,
    skipped: row.skipped,
  };
}

/**
 * The user's "today", checked: a real date within a day of the server's
 * (time zones run from UTC−12 to UTC+14), so it can't be used to hide or
 * invent overdue bills.
 */
function checkToday(today: string): string {
  if (!isCalendarDate(today)) throw new ConvexError("That isn't a real date.");
  const now = Date.now();
  const day = (offsetHours: number) => new Date(now + offsetHours * 3600_000).toISOString().slice(0, 10);
  if (today < day(-14) || today > day(14)) throw new ConvexError("Your device's date looks wrong.");
  return today;
}

/** The signed-in user's recurring rules, oldest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireOwner(ctx);
    const rows = await ctx.db
      .query("recurringRules")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();
    return rows.map(toRule);
  },
});

/** The user's own rule with this id, or a refusal. */
async function ownRule(ctx: QueryCtx, ownerId: string, id: string): Promise<Doc<"recurringRules">> {
  const ruleId = ctx.db.normalizeId("recurringRules", id);
  const rule = ruleId ? await ctx.db.get(ruleId) : null;
  if (!rule || rule.ownerId !== ownerId) throw new ConvexError("That recurring item isn't one of yours.");
  return rule;
}

/**
 * The rule's values, checked: the rules in ruleProblem, a known currency,
 * the user's own category of the rule's kind, and, if one is named, the
 * user's own account in the rule's currency.
 */
async function checkedFields(ctx: QueryCtx, ownerId: string, args: RuleValues) {
  const problem = ruleProblem({
    name: args.name,
    amount: { amountMinor: args.amountMinor, currency: args.currency },
    frequency: args.frequency,
    startDate: args.startDate,
    endDate: args.endDate,
    remindDays: args.remindDays,
  });
  if (problem) throw new ConvexError(problem);
  checkCurrency(args.currency);

  const categoryId = ctx.db.normalizeId("categories", args.categoryId);
  const category = categoryId ? await ctx.db.get(categoryId) : null;
  if (!category || category.ownerId !== ownerId) throw new ConvexError("That category isn't one of yours.");
  if (category.kind !== args.type) {
    throw new ConvexError(`${category.name} is for ${category.kind === "income" ? "income" : "spending"}.`);
  }

  let accountId: Id<"accounts"> | undefined;
  if (args.accountId !== null) {
    const id = ctx.db.normalizeId("accounts", args.accountId);
    const account = id ? await ctx.db.get(id) : null;
    if (!account || account.ownerId !== ownerId) throw new ConvexError("That account isn't one of yours.");
    if (account.currency !== args.currency) {
      throw new ConvexError(`${account.name} is in ${account.currency}, not ${args.currency}.`);
    }
    accountId = account._id;
  }

  return {
    name: args.name.trim(),
    type: args.type,
    amountMinor: args.amountMinor,
    currency: args.currency,
    categoryId: category._id,
    accountId,
    frequency: args.frequency,
    startDate: args.startDate,
    endDate: args.endDate ?? undefined,
    remindDays: args.remindDays,
    updatedAt: Date.now(),
  };
}

/** The later of two "YYYY-MM-DD" dates. */
const later = (a: string, b: string) => (a > b ? a : b);

/**
 * Adds a recurring rule. Only occurrences from today (or the start date,
 * if later) are listed; earlier ones are history, recorded or not.
 */
export const create = mutation({
  args: ruleArgs,
  handler: async (ctx, { today, ...args }) => {
    const ownerId = await requireOwner(ctx);
    const fields = await checkedFields(ctx, ownerId, args);
    return await ctx.db.insert("recurringRules", {
      ownerId,
      ...fields,
      trackFrom: later(fields.startDate, checkToday(today)),
      paused: false,
      skipped: [],
    });
  },
});

/**
 * Changes a rule. What's already recorded stays as it is; the change
 * applies to the occurrences still to come. A new start date starts the
 * listing afresh from it (or today), since the old dates no longer apply.
 */
export const update = mutation({
  args: { id: v.string(), ...ruleArgs },
  handler: async (ctx, { id, today, ...args }) => {
    const ownerId = await requireOwner(ctx);
    const rule = await ownRule(ctx, ownerId, id);
    const fields = await checkedFields(ctx, ownerId, args);
    const restarted = fields.startDate !== rule.startDate || fields.frequency !== rule.frequency;
    await ctx.db.replace(rule._id, {
      ownerId,
      ...fields,
      trackFrom: restarted ? later(fields.startDate, checkToday(today)) : rule.trackFrom,
      paused: rule.paused,
      skipped: restarted ? [] : rule.skipped,
    });
  },
});

/**
 * Pauses a rule (nothing is listed while paused) or resumes it. Resuming
 * lists occurrences from today, not the ones that fell while it was paused.
 */
export const setPaused = mutation({
  args: { id: v.string(), paused: v.boolean(), today: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const rule = await ownRule(ctx, ownerId, args.id);
    await ctx.db.patch(rule._id, {
      paused: args.paused,
      ...(!args.paused && rule.paused && { trackFrom: later(rule.startDate, checkToday(args.today)) }),
      updatedAt: Date.now(),
    });
  },
});

/** Skips one occurrence (or, with skip false, brings it back). */
export const setSkipped = mutation({
  args: { id: v.string(), date: v.string(), skip: v.boolean() },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const rule = await ownRule(ctx, ownerId, args.id);
    const real = occurrencesBetween(
      { frequency: rule.frequency, startDate: rule.startDate, endDate: rule.endDate ?? null },
      args.date,
      args.date,
    );
    if (!isCalendarDate(args.date) || real.length === 0) {
      throw new ConvexError(`${rule.name} isn't due on ${args.date}.`);
    }
    // Dates before trackFrom are never listed, so they needn't be kept.
    const others = rule.skipped.filter((d) => d !== args.date && d >= rule.trackFrom);
    await ctx.db.patch(rule._id, {
      skipped: args.skip ? [...others, args.date].sort() : others,
      updatedAt: Date.now(),
    });
  },
});

/** Deletes a rule. The transactions it recorded stay, as ordinary transactions. */
export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const rule = await ownRule(ctx, ownerId, args.id);
    await ctx.db.delete(rule._id);
  },
});
