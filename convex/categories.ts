import { ConvexError, v } from "convex/values";
import {
  categoryNameProblem,
  DEFAULT_CATEGORIES,
  sameName,
  type Category,
  type CategoryKind,
} from "../src/lib/categories";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireOwner } from "./ownership";

const kindArg = v.union(v.literal("expense"), v.literal("income"));

/** A stored category in the shape the app uses. */
function toCategory(row: Doc<"categories">): Category {
  return { id: row._id, name: row.name, kind: row.kind, archived: row.archived };
}

async function rowsOf(ctx: QueryCtx, ownerId: string): Promise<Doc<"categories">[]> {
  return await ctx.db
    .query("categories")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .collect();
}

/**
 * The user's categories, oldest first, after giving a user who has none
 * the default list (PRD 9). Every saving path goes through here, so a
 * transaction always finds its category, whatever runs first.
 */
export async function categoriesOf(
  ctx: MutationCtx,
  ownerId: string,
): Promise<Doc<"categories">[]> {
  const rows = await rowsOf(ctx, ownerId);
  if (rows.length > 0) return rows;
  for (const { name, kind } of DEFAULT_CATEGORIES) {
    await ctx.db.insert("categories", { ownerId, name, kind, archived: false, updatedAt: Date.now() });
  }
  return await rowsOf(ctx, ownerId);
}

/**
 * The category called `name` among the user's `kind` categories, made if
 * there's none (an archived one counts, so history is never split in two).
 * For transactions that arrive with only a name: from the browser's old
 * data, or saved before categories existed.
 */
export async function categoryNamed(
  ctx: MutationCtx,
  ownerId: string,
  rows: Doc<"categories">[],
  name: string,
  kind: CategoryKind,
): Promise<Doc<"categories">> {
  const found = rows.find((c) => c.kind === kind && sameName(c.name, name));
  if (found) return found;
  if (categoryNameProblem(name, kind, rows) !== null) {
    throw new ConvexError(`${name} can't be used as a category name.`);
  }
  const id = await ctx.db.insert("categories", {
    ownerId,
    name: name.trim(),
    kind,
    archived: false,
    updatedAt: Date.now(),
  });
  const made = (await ctx.db.get(id))!;
  rows.push(made);
  return made;
}

/** The user's own category with this id, or a refusal. */
async function ownCategory(ctx: QueryCtx, ownerId: string, id: string): Promise<Doc<"categories">> {
  const categoryId = ctx.db.normalizeId("categories", id);
  const category = categoryId ? await ctx.db.get(categoryId) : null;
  if (!category || category.ownerId !== ownerId) {
    throw new ConvexError("That category isn't one of yours.");
  }
  return category;
}

/**
 * The category a new or edited income or expense goes in, checked: by id,
 * it must be the user's own and of the transaction's kind (spending can't
 * be filed under Salary); by name, it must be one the user has. An
 * archived one is accepted: editing an old transaction keeps its category.
 */
export async function checkedCategory(
  ctx: MutationCtx,
  ownerId: string,
  kind: CategoryKind,
  categoryId: string | undefined,
  name: string,
): Promise<Doc<"categories">> {
  if (categoryId !== undefined) {
    const category = await ownCategory(ctx, ownerId, categoryId);
    if (category.kind !== kind) {
      throw new ConvexError(`${category.name} is for ${category.kind === "income" ? "income" : "spending"}.`);
    }
    return category;
  }
  const rows = await categoriesOf(ctx, ownerId);
  const found = rows.find((c) => c.kind === kind && sameName(c.name, name));
  if (!found) throw new ConvexError(`${name} isn't one of your categories.`);
  return found;
}

/** The signed-in user's categories, oldest first, archived ones included. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireOwner(ctx);
    return (await rowsOf(ctx, ownerId)).map(toCategory);
  },
});

/** Adds a category for the signed-in user. Returns its id. */
export const create = mutation({
  args: { name: v.string(), kind: kindArg },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const rows = await categoriesOf(ctx, ownerId);
    const problem = categoryNameProblem(args.name, args.kind, rows);
    if (problem) throw new ConvexError(problem);
    return await ctx.db.insert("categories", {
      ownerId,
      name: args.name.trim(),
      kind: args.kind,
      archived: false,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Renames a category. Transactions refer to it by id, so they all show the
 * new name at once. Its kind never changes: that would turn its past
 * spending into income.
 */
export const rename = mutation({
  args: { id: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const category = await ownCategory(ctx, ownerId, args.id);
    const others = (await rowsOf(ctx, ownerId)).filter((c) => c._id !== category._id);
    const problem = categoryNameProblem(args.name, category.kind, others);
    if (problem) throw new ConvexError(problem);
    await ctx.db.patch(category._id, { name: args.name.trim(), updatedAt: Date.now() });
  },
});

/**
 * Archives a category (no longer offered for new transactions; the ones
 * already in it keep it) or brings it back.
 */
export const setArchived = mutation({
  args: { id: v.string(), archived: v.boolean() },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const category = await ownCategory(ctx, ownerId, args.id);
    await ctx.db.patch(category._id, { archived: args.archived, updatedAt: Date.now() });
  },
});

/** How many transactions one ensureCategories call links. */
const LINK_BATCH_SIZE = 200;

/**
 * Moves a user from the fixed category list to their own categories,
 * safely and repeatably: they get the default list if they have none, and
 * each income or expense without a category id is linked to the category
 * of its name and kind, made if needed (an old "Rent" becomes a spending
 * category of the user's own). A batch at a time; `more` says to call
 * again. Running it again does nothing new.
 */
export const ensureCategories = mutation({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireOwner(ctx);
    const rows = await categoriesOf(ctx, ownerId);
    let linked = 0;
    for (const kind of ["expense", "income"] as const) {
      const unlinked = await ctx.db
        .query("transactions")
        .withIndex("by_owner_type_category", (q) =>
          q.eq("ownerId", ownerId).eq("type", kind).eq("categoryId", undefined),
        )
        .take(LINK_BATCH_SIZE - linked);
      for (const transaction of unlinked) {
        const category = await categoryNamed(ctx, ownerId, rows, transaction.category, kind);
        await ctx.db.patch(transaction._id, { categoryId: category._id, category: category.name });
      }
      linked += unlinked.length;
      if (linked === LINK_BATCH_SIZE) break;
    }
    return { linked, more: linked === LINK_BATCH_SIZE };
  },
});
