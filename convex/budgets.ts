import { ConvexError, v } from "convex/values";
import { budgetProblem, type Budget } from "../src/lib/budgets";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { requireOwner } from "./ownership";
import { checkCurrency } from "./validation";

const budgetArgs = {
  name: v.optional(v.string()),
  categoryId: v.union(v.string(), v.null()),
  limitMinor: v.number(),
  currency: v.string(),
  warnPercent: v.number(),
};

/** A stored budget in the shape the app uses. */
function toBudget(row: Doc<"budgets">): Budget {
  return {
    id: row._id,
    ...(row.name !== undefined && { name: row.name }),
    categoryId: row.categoryId ?? null,
    limit: { amountMinor: row.limitMinor, currency: row.currency },
    warnPercent: row.warnPercent,
  };
}

async function rowsOf(ctx: QueryCtx, ownerId: string): Promise<Doc<"budgets">[]> {
  return await ctx.db
    .query("budgets")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .collect();
}

/** The signed-in user's budgets, oldest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireOwner(ctx);
    return (await rowsOf(ctx, ownerId)).map(toBudget);
  },
});

/**
 * The budget's fields, checked: the category, if any, must be one of the
 * user's spending categories (archived is fine: an existing budget keeps
 * it), the currency a known one, and the rest as budgetProblem says,
 * against the user's other budgets (`exceptId` is the one being edited).
 */
async function checkedFields(
  ctx: QueryCtx,
  ownerId: string,
  args: { name?: string; categoryId: string | null; limitMinor: number; currency: string; warnPercent: number },
  exceptId?: Id<"budgets">,
) {
  let categoryId: Id<"categories"> | undefined;
  if (args.categoryId !== null) {
    const id = ctx.db.normalizeId("categories", args.categoryId);
    const category = id ? await ctx.db.get(id) : null;
    if (!category || category.ownerId !== ownerId) {
      throw new ConvexError("That category isn't one of yours.");
    }
    if (category.kind !== "expense") {
      throw new ConvexError(`${category.name} is for income: a budget limits spending.`);
    }
    categoryId = category._id;
  }
  const name = args.name?.trim() || undefined;
  const values: Omit<Budget, "id"> = {
    ...(name !== undefined && { name }),
    categoryId: categoryId ?? null,
    limit: { amountMinor: args.limitMinor, currency: checkCurrency(args.currency) },
    warnPercent: args.warnPercent,
  };
  const others = (await rowsOf(ctx, ownerId)).filter((b) => b._id !== exceptId).map(toBudget);
  const problem = budgetProblem(values, others);
  if (problem) throw new ConvexError(problem);
  return {
    name,
    categoryId,
    limitMinor: args.limitMinor,
    currency: args.currency,
    warnPercent: args.warnPercent,
    updatedAt: Date.now(),
  };
}

/** The user's own budget with this id, or a refusal. */
async function ownBudget(ctx: QueryCtx, ownerId: string, id: string): Promise<Doc<"budgets">> {
  const budgetId = ctx.db.normalizeId("budgets", id);
  const budget = budgetId ? await ctx.db.get(budgetId) : null;
  if (!budget || budget.ownerId !== ownerId) {
    throw new ConvexError("That budget isn't one of yours.");
  }
  return budget;
}

/** Adds a budget for the signed-in user. Returns its id. */
export const create = mutation({
  args: budgetArgs,
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    return await ctx.db.insert("budgets", { ownerId, ...(await checkedFields(ctx, ownerId, args)) });
  },
});

/** Changes a budget: everything can change, since no history depends on it. */
export const update = mutation({
  args: { id: v.string(), ...budgetArgs },
  handler: async (ctx, { id, ...args }) => {
    const ownerId = await requireOwner(ctx);
    const budget = await ownBudget(ctx, ownerId, id);
    // replace, not patch, so a removed name or category really goes away.
    await ctx.db.replace(budget._id, { ownerId, ...(await checkedFields(ctx, ownerId, args, budget._id)) });
  },
});

/** Deletes a budget. The transactions it counted are untouched. */
export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const budget = await ownBudget(ctx, ownerId, args.id);
    await ctx.db.delete(budget._id);
  },
});
