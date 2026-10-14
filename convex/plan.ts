import { ConvexError, v } from "convex/values";
import { DEFAULT_PLAN, planProblem, type PlanSettings } from "../src/lib/plan";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireOwner } from "./ownership";

/** The signed-in user's plan settings, or the defaults if they never saved any. */
export const get = query({
  args: {},
  handler: async (ctx): Promise<PlanSettings> => {
    const ownerId = await requireOwner(ctx);
    const row = await ctx.db
      .query("plans")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .unique();
    if (!row) return DEFAULT_PLAN;
    return {
      reserveMinor: row.reserveMinor,
      savingsMinor: row.savingsMinor,
      accountIds: row.accountIds ?? null,
      salaryRuleId: row.salaryRuleId ?? null,
      payday: row.payday ?? null,
    };
  },
});

/**
 * Saves the plan settings, checked: amounts zero or more, a real date, and
 * only the user's own accounts and an income rule of their own.
 */
export const set = mutation({
  args: {
    reserveMinor: v.number(),
    savingsMinor: v.number(),
    accountIds: v.union(v.array(v.string()), v.null()),
    salaryRuleId: v.union(v.string(), v.null()),
    payday: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const problem = planProblem(args);
    if (problem) throw new ConvexError(problem);

    let accountIds: Id<"accounts">[] | undefined;
    if (args.accountIds !== null) {
      accountIds = [];
      for (const raw of args.accountIds) {
        const id = ctx.db.normalizeId("accounts", raw);
        const account = id ? await ctx.db.get(id) : null;
        if (!account || account.ownerId !== ownerId) throw new ConvexError("That account isn't one of yours.");
        if (!accountIds.includes(account._id)) accountIds.push(account._id);
      }
    }
    let salaryRuleId: Id<"recurringRules"> | undefined;
    if (args.salaryRuleId !== null) {
      const id = ctx.db.normalizeId("recurringRules", args.salaryRuleId);
      const rule = id ? await ctx.db.get(id) : null;
      if (!rule || rule.ownerId !== ownerId) throw new ConvexError("That recurring item isn't one of yours.");
      if (rule.type !== "income") throw new ConvexError(`${rule.name} isn't income, so it can't be your payday.`);
      salaryRuleId = rule._id;
    }

    const fields = {
      ownerId,
      reserveMinor: args.reserveMinor,
      savingsMinor: args.savingsMinor,
      accountIds,
      salaryRuleId,
      payday: args.payday ?? undefined,
      updatedAt: Date.now(),
    };
    const row = await ctx.db
      .query("plans")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .unique();
    if (row) await ctx.db.replace(row._id, fields);
    else await ctx.db.insert("plans", fields);
  },
});
