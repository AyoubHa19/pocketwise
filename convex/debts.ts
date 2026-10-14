import { ConvexError, v } from "convex/values";
import { debtProblem, type Debt } from "../src/lib/debts";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { requireOwner } from "./ownership";
import { checkCurrency } from "./validation";

const frequencyArg = v.union(
  v.literal("weekly"),
  v.literal("biweekly"),
  v.literal("monthly"),
  v.literal("quarterly"),
  v.literal("yearly"),
);

const debtArgs = {
  name: v.string(),
  currency: v.string(),
  balanceMinor: v.number(),
  balanceDate: v.string(),
  paymentMinor: v.number(),
  frequency: frequencyArg,
  nextDue: v.union(v.string(), v.null()),
  annualRate: v.union(v.string(), v.null()),
  originalMinor: v.union(v.number(), v.null()),
  ruleId: v.union(v.string(), v.null()),
  /** The user's own date, to check the balance date isn't in the future. */
  today: v.string(),
};

/** A debt's values as the functions receive them. */
type DebtValues = Omit<Debt, "id" | "archived">;

function toDebt(row: Doc<"debts">): Debt {
  return {
    id: row._id,
    name: row.name,
    currency: row.currency,
    balanceMinor: row.balanceMinor,
    balanceDate: row.balanceDate,
    paymentMinor: row.paymentMinor,
    frequency: row.frequency,
    nextDue: row.nextDue ?? null,
    annualRate: row.annualRate ?? null,
    originalMinor: row.originalMinor ?? null,
    ruleId: row.ruleId ?? null,
    archived: row.archived,
  };
}

/** The signed-in user's debts, oldest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireOwner(ctx);
    const rows = await ctx.db
      .query("debts")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();
    return rows.map(toDebt);
  },
});

async function ownDebt(ctx: QueryCtx, ownerId: string, id: string): Promise<Doc<"debts">> {
  const debtId = ctx.db.normalizeId("debts", id);
  const debt = debtId ? await ctx.db.get(debtId) : null;
  if (!debt || debt.ownerId !== ownerId) throw new ConvexError("That debt isn't one of yours.");
  return debt;
}

/**
 * The debt's values, checked: the rules in debtProblem, a known currency,
 * and, if it's paid through a recurring item, the user's own expense item
 * in the same currency.
 */
async function checkedFields(ctx: QueryCtx, ownerId: string, { today, ...args }: DebtValues & { today: string }) {
  const values = { ...args, name: args.name.trim(), annualRate: args.annualRate?.trim() || null };
  const problem = debtProblem(values, today);
  if (problem) throw new ConvexError(problem);
  checkCurrency(values.currency);
  let ruleId: Id<"recurringRules"> | undefined;
  if (values.ruleId !== null) {
    const id = ctx.db.normalizeId("recurringRules", values.ruleId);
    const rule = id ? await ctx.db.get(id) : null;
    if (!rule || rule.ownerId !== ownerId) throw new ConvexError("That recurring item isn't one of yours.");
    if (rule.type !== "expense") throw new ConvexError(`${rule.name} is income, so it can't pay a debt.`);
    if (rule.currency !== values.currency) {
      throw new ConvexError(`${rule.name} is in ${rule.currency}, not ${values.currency}.`);
    }
    ruleId = rule._id;
  }
  return {
    name: values.name,
    currency: values.currency,
    balanceMinor: values.balanceMinor,
    balanceDate: values.balanceDate,
    paymentMinor: values.paymentMinor,
    frequency: values.frequency,
    nextDue: values.nextDue ?? undefined,
    annualRate: values.annualRate ?? undefined,
    originalMinor: values.originalMinor ?? undefined,
    ruleId,
    updatedAt: Date.now(),
  };
}

/** Adds a debt. Returns its id. */
export const create = mutation({
  args: debtArgs,
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    return await ctx.db.insert("debts", { ownerId, ...(await checkedFields(ctx, ownerId, args)), archived: false });
  },
});

/** Changes a debt, like a new balance from a statement. Its payments are untouched. */
export const update = mutation({
  args: { id: v.string(), ...debtArgs },
  handler: async (ctx, { id, ...args }) => {
    const ownerId = await requireOwner(ctx);
    const debt = await ownDebt(ctx, ownerId, id);
    await ctx.db.replace(debt._id, { ownerId, ...(await checkedFields(ctx, ownerId, args)), archived: debt.archived });
  },
});

/** Archives a debt (paid off, put away) or brings it back. */
export const setArchived = mutation({
  args: { id: v.string(), archived: v.boolean() },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const debt = await ownDebt(ctx, ownerId, args.id);
    await ctx.db.patch(debt._id, { archived: args.archived, updatedAt: Date.now() });
  },
});

/** Deletes a debt. Its payments stay, as ordinary transactions. */
export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const debt = await ownDebt(ctx, ownerId, args.id);
    await ctx.db.delete(debt._id);
  },
});
