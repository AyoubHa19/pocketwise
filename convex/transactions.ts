import { ConvexError, v } from "convex/values";
import { IMPORT_BATCH_SIZE } from "../src/lib/localImport";
import type { Transaction } from "../src/lib/transactions";
import { defaultAccountFor, ownedAccount } from "./accounts";
import { categoriesOf, categoryNamed, checkedCategory } from "./categories";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireOwner } from "./ownership";
import { checkTransaction } from "./validation";

// A transaction as the app knows it (src/lib/transactions.ts). Convex checks
// this shape before the function even runs; checkTransaction checks the
// values.
const transactionArg = v.object({
  id: v.string(),
  type: v.union(v.literal("income"), v.literal("expense"), v.literal("transfer")),
  amount: v.object({ amountMinor: v.number(), currency: v.string() }),
  category: v.string(),
  categoryId: v.optional(v.string()),
  date: v.string(),
  description: v.optional(v.string()),
  note: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  accountId: v.optional(v.string()),
  toAccountId: v.optional(v.string()),
});

/**
 * A stored row back in the shape the app uses, without server-only fields,
 * named after its category as it's called now (`names`, by id).
 */
function toTransaction(row: Doc<"transactions">, names: Map<string, string>): Transaction {
  return {
    id: row.clientId,
    type: row.type,
    amount: { amountMinor: row.amountMinor, currency: row.currency },
    category: (row.categoryId && names.get(row.categoryId)) ?? row.category,
    ...(row.categoryId !== undefined && { categoryId: row.categoryId }),
    date: row.date,
    ...(row.description !== undefined && { description: row.description }),
    ...(row.note !== undefined && { note: row.note }),
    ...(row.tags !== undefined && { tags: row.tags }),
    ...(row.accountId !== undefined && { accountId: row.accountId }),
    ...(row.toAccountId !== undefined && { toAccountId: row.toAccountId }),
  };
}

/**
 * The accounts a transaction names, checked: each must be the user's own
 * and in the transaction's currency (a transfer between currencies needs an
 * exchange rate, which comes later). checkTransaction has already made sure
 * a transfer names two different accounts. A transaction that names none
 * goes to the account for its currency, so every new one is in an account
 * and every balance stays complete.
 */
async function checkedAccounts(ctx: MutationCtx, ownerId: string, t: Transaction) {
  const currency = t.amount.currency;
  const from = t.accountId
    ? await ownedAccount(ctx, ownerId, t.accountId, currency)
    : await defaultAccountFor(ctx, ownerId, currency);
  const to = t.toAccountId ? await ownedAccount(ctx, ownerId, t.toAccountId, currency) : undefined;
  return { accountId: from._id, toAccountId: to?._id };
}

/** The signed-in user's transactions: newest day first, newest first within a day. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireOwner(ctx);
    const rows = await ctx.db
      .query("transactions")
      .withIndex("by_owner_date", (q) => q.eq("ownerId", ownerId))
      .order("desc")
      .collect();
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();
    const names = new Map<string, string>(categories.map((c) => [c._id, c.name]));
    return rows.map((row) => toTransaction(row, names));
  },
});

/**
 * Adds a transaction, or updates the one with the same id. Only ever the
 * signed-in user's own: the id is looked up among their transactions, so
 * another user's transaction can't be overwritten, even with its id.
 */
export const save = mutation({
  args: { transaction: transactionArg },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const t = checkTransaction(args.transaction);
    const category =
      t.type === "transfer"
        ? undefined
        : await checkedCategory(ctx, ownerId, t.type, t.categoryId, t.category);
    const fields = {
      type: t.type,
      amountMinor: t.amount.amountMinor,
      currency: t.amount.currency,
      category: category?.name ?? t.category,
      categoryId: category?._id,
      date: t.date,
      description: t.description?.trim() || undefined,
      note: t.note?.trim() || undefined,
      tags: t.tags?.length ? t.tags : undefined,
      ...(await checkedAccounts(ctx, ownerId, t)),
      updatedAt: Date.now(),
    };
    const existing = await ctx.db
      .query("transactions")
      .withIndex("by_owner_clientId", (q) =>
        q.eq("ownerId", ownerId).eq("clientId", t.id),
      )
      .unique();
    if (existing) {
      // replace, not patch, so a removed note really goes away.
      await ctx.db.replace(existing._id, { ownerId, clientId: t.id, ...fields });
    } else {
      await ctx.db.insert("transactions", { ownerId, clientId: t.id, ...fields });
    }
  },
});

/**
 * Moves transactions saved in the browser (before accounts existed) into
 * the signed-in user's account. Every one is checked before anything is
 * written, so a batch is saved completely or not at all. One whose id is
 * already in the account is skipped, never overwritten: that's what makes
 * retrying safe, and an edit made in the account is never undone by an
 * older browser copy.
 */
export const importLocal = mutation({
  args: { transactions: v.array(transactionArg) },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    if (args.transactions.length > IMPORT_BATCH_SIZE) {
      throw new ConvexError(`Send at most ${IMPORT_BATCH_SIZE} transactions at a time.`);
    }
    const checked = args.transactions.map(checkTransaction);
    // The browser's old data is from before accounts and categories: it has
    // neither, and so no transfers. Each goes to the account for its
    // currency, and to the category of its name, made if needed.
    if (
      checked.some(
        (t) => t.type === "transfer" || t.accountId !== undefined || t.categoryId !== undefined,
      )
    ) {
      throw new ConvexError("Browser data from before accounts can't name accounts or categories.");
    }
    const categories = await categoriesOf(ctx, ownerId);
    let added = 0;
    let skipped = 0;
    for (const t of checked) {
      const existing = await ctx.db
        .query("transactions")
        .withIndex("by_owner_clientId", (q) =>
          q.eq("ownerId", ownerId).eq("clientId", t.id),
        )
        .unique();
      if (existing) {
        skipped++;
        continue;
      }
      // Checked above: old data has only income and expenses.
      const category = await categoryNamed(ctx, ownerId, categories, t.category, t.type as "income" | "expense");
      await ctx.db.insert("transactions", {
        ownerId,
        clientId: t.id,
        type: t.type,
        amountMinor: t.amount.amountMinor,
        currency: t.amount.currency,
        category: category.name,
        categoryId: category._id,
        date: t.date,
        note: t.note?.trim() || undefined,
        accountId: (await defaultAccountFor(ctx, ownerId, t.amount.currency))._id,
        updatedAt: Date.now(),
      });
      added++;
    }
    return { added, skipped };
  },
});

/** Deletes one of the signed-in user's transactions. False if there was none. */
export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const existing = await ctx.db
      .query("transactions")
      .withIndex("by_owner_clientId", (q) =>
        q.eq("ownerId", ownerId).eq("clientId", args.id),
      )
      .unique();
    if (!existing) return false;
    await ctx.db.delete(existing._id);
    return true;
  },
});
