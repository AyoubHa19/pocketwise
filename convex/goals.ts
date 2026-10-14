import { ConvexError, v } from "convex/values";
import {
  contributionProblem,
  goalProblem,
  type Contribution,
  type Goal,
} from "../src/lib/goals";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { requireOwner } from "./ownership";
import { checkCurrency } from "./validation";

/** A stored goal in the shape the app uses. */
function toGoal(row: Doc<"goals">): Goal {
  return {
    id: row._id,
    name: row.name,
    target: { amountMinor: row.targetMinor, currency: row.currency },
    targetDate: row.targetDate ?? null,
    accountId: row.accountId ?? null,
    archived: row.archived,
  };
}

function toContribution(row: Doc<"goalContributions">): Contribution {
  return {
    id: row._id,
    goalId: row.goalId,
    amountMinor: row.amountMinor,
    date: row.date,
    ...(row.note !== undefined && { note: row.note }),
  };
}

/** The signed-in user's goals, oldest first, archived ones included. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireOwner(ctx);
    const rows = await ctx.db
      .query("goals")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();
    return rows.map(toGoal);
  },
});

/** Every entry in the signed-in user's goals, oldest first. */
export const contributions = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireOwner(ctx);
    const rows = await ctx.db
      .query("goalContributions")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();
    return rows.map(toContribution);
  },
});

/** The user's own goal with this id, or a refusal. */
async function ownGoal(ctx: QueryCtx, ownerId: string, id: string): Promise<Doc<"goals">> {
  const goalId = ctx.db.normalizeId("goals", id);
  const goal = goalId ? await ctx.db.get(goalId) : null;
  if (!goal || goal.ownerId !== ownerId) throw new ConvexError("That goal isn't one of yours.");
  return goal;
}

/**
 * The account a goal follows, checked: the user's own, in the goal's
 * currency (a balance in another currency can't be compared with the
 * target). Undefined for a goal that counts its own entries.
 */
async function checkedAccount(
  ctx: QueryCtx,
  ownerId: string,
  accountId: string | null,
  currency: string,
): Promise<Id<"accounts"> | undefined> {
  if (accountId === null) return undefined;
  const id = ctx.db.normalizeId("accounts", accountId);
  const account = id ? await ctx.db.get(id) : null;
  if (!account || account.ownerId !== ownerId) throw new ConvexError("That account isn't one of yours.");
  if (account.currency !== currency) {
    throw new ConvexError(`${account.name} is in ${account.currency}, not ${currency}.`);
  }
  return account._id;
}

/** Throws unless the values are a goal the server will store. */
function checkGoal(name: string, targetMinor: number, currency: string, targetDate: string | null) {
  const problem = goalProblem({ name, target: { amountMinor: targetMinor, currency }, targetDate });
  if (problem) throw new ConvexError(problem);
}

const goalArgs = {
  name: v.string(),
  targetMinor: v.number(),
  targetDate: v.union(v.string(), v.null()),
  accountId: v.union(v.string(), v.null()),
};

/** Adds a goal for the signed-in user. Returns its id. */
export const create = mutation({
  args: { ...goalArgs, currency: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    checkCurrency(args.currency);
    checkGoal(args.name, args.targetMinor, args.currency, args.targetDate);
    return await ctx.db.insert("goals", {
      ownerId,
      name: args.name.trim(),
      targetMinor: args.targetMinor,
      currency: args.currency,
      targetDate: args.targetDate ?? undefined,
      accountId: await checkedAccount(ctx, ownerId, args.accountId, args.currency),
      archived: false,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Changes a goal's name, target, date and what it follows. Its currency
 * stays: its entries are in it. Switching to an account keeps the goal's
 * own entries, which count again if it switches back.
 */
export const update = mutation({
  args: { id: v.string(), ...goalArgs },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const goal = await ownGoal(ctx, ownerId, args.id);
    checkGoal(args.name, args.targetMinor, goal.currency, args.targetDate);
    await ctx.db.replace(goal._id, {
      ownerId,
      name: args.name.trim(),
      targetMinor: args.targetMinor,
      currency: goal.currency,
      targetDate: args.targetDate ?? undefined,
      accountId: await checkedAccount(ctx, ownerId, args.accountId, goal.currency),
      archived: goal.archived,
      updatedAt: Date.now(),
    });
  },
});

/** Archives a goal (put away, nothing deleted) or brings it back. */
export const setArchived = mutation({
  args: { id: v.string(), archived: v.boolean() },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const goal = await ownGoal(ctx, ownerId, args.id);
    await ctx.db.patch(goal._id, { archived: args.archived, updatedAt: Date.now() });
  },
});

/**
 * Deletes a goal and its own entries. Money in an account it followed, and
 * every transaction, are untouched.
 */
export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const goal = await ownGoal(ctx, ownerId, args.id);
    const entries = await ctx.db
      .query("goalContributions")
      .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
      .collect();
    for (const entry of entries) await ctx.db.delete(entry._id);
    await ctx.db.delete(goal._id);
  },
});

/**
 * Notes money put aside for a goal (above zero) or taken back out (below
 * zero), checked: never more out than the goal's entries hold.
 */
export const addContribution = mutation({
  args: { goalId: v.string(), amountMinor: v.number(), date: v.string(), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const goal = await ownGoal(ctx, ownerId, args.goalId);
    if (goal.accountId !== undefined) {
      throw new ConvexError(`${goal.name} follows an account: put money aside with a transfer into it.`);
    }
    const entries = await ctx.db
      .query("goalContributions")
      .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
      .collect();
    const saved = entries.reduce((sum, e) => sum + e.amountMinor, 0);
    const note = args.note?.trim() || undefined;
    const problem = contributionProblem(args.amountMinor, saved, args.date, note);
    if (problem) throw new ConvexError(problem);
    return await ctx.db.insert("goalContributions", {
      ownerId,
      goalId: goal._id,
      amountMinor: args.amountMinor,
      date: args.date,
      note,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Deletes one entry. Deleting money put in can't leave the goal below
 * zero (it would mean more was taken out than ever went in).
 */
export const removeContribution = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const entryId = ctx.db.normalizeId("goalContributions", args.id);
    const entry = entryId ? await ctx.db.get(entryId) : null;
    if (!entry || entry.ownerId !== ownerId) throw new ConvexError("That entry isn't one of yours.");
    const entries = await ctx.db
      .query("goalContributions")
      .withIndex("by_goal", (q) => q.eq("goalId", entry.goalId))
      .collect();
    const savedAfter = entries.reduce((sum, e) => sum + e.amountMinor, 0) - entry.amountMinor;
    if (savedAfter < 0) {
      throw new ConvexError("Delete the money taken out first: without this, it would be more than was put in.");
    }
    await ctx.db.delete(entry._id);
  },
});
