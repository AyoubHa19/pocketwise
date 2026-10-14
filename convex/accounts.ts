import { ConvexError, v } from "convex/values";
import {
  defaultAccountName,
  MAX_ACCOUNT_NAME_LENGTH,
  type Account,
} from "../src/lib/accounts";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireOwner } from "./ownership";
import { checkCurrency, isCalendarDate } from "./validation";

const accountTypeArg = v.union(
  v.literal("cash"),
  v.literal("bank"),
  v.literal("savings"),
  v.literal("wallet"),
  v.literal("other"),
);
const openingArg = v.union(v.object({ amountMinor: v.number(), date: v.string() }), v.null());

/** A stored account in the shape the app uses. */
function toAccount(row: Doc<"accounts">): Account {
  return {
    id: row._id,
    name: row.name,
    type: row.type,
    currency: row.currency,
    opening: row.opening,
    archived: row.archived,
  };
}

/** The signed-in user's accounts, oldest first, archived ones included. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireOwner(ctx);
    const rows = await ctx.db
      .query("accounts")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();
    return rows.map(toAccount);
  },
});

/** Throws unless `name` is a usable account name; returns it trimmed. */
function checkName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) throw new ConvexError("Give the account a name.");
  if (trimmed.length > MAX_ACCOUNT_NAME_LENGTH) {
    throw new ConvexError(`An account name can be up to ${MAX_ACCOUNT_NAME_LENGTH} characters.`);
  }
  return trimmed;
}

/** Throws unless `opening` is a whole amount on a real day. */
function checkOpening(opening: Doc<"accounts">["opening"]) {
  if (opening === null) return null;
  if (!Number.isSafeInteger(opening.amountMinor)) {
    throw new ConvexError("That starting balance isn't a valid amount.");
  }
  if (!isCalendarDate(opening.date)) throw new ConvexError(`${opening.date} isn't a real date.`);
  return opening;
}

/** Adds an account for the signed-in user. Returns its id. */
export const create = mutation({
  args: { name: v.string(), type: accountTypeArg, currency: v.string(), opening: openingArg },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    return await ctx.db.insert("accounts", {
      ownerId,
      name: checkName(args.name),
      type: args.type,
      currency: checkCurrency(args.currency),
      opening: checkOpening(args.opening),
      archived: false,
      updatedAt: Date.now(),
    });
  },
});

/** The user's own account with this id, or a refusal. */
async function ownAccount(ctx: QueryCtx, ownerId: string, id: string): Promise<Doc<"accounts">> {
  const accountId = ctx.db.normalizeId("accounts", id);
  const account = accountId ? await ctx.db.get(accountId) : null;
  if (!account || account.ownerId !== ownerId) {
    throw new ConvexError("That account isn't one of yours.");
  }
  return account;
}

/**
 * Changes an account's name, type and starting balance. Its currency can't
 * change: everything recorded in it is in that currency.
 */
export const update = mutation({
  args: { id: v.string(), name: v.string(), type: accountTypeArg, opening: openingArg },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const account = await ownAccount(ctx, ownerId, args.id);
    await ctx.db.patch(account._id, {
      name: checkName(args.name),
      type: args.type,
      opening: checkOpening(args.opening),
      updatedAt: Date.now(),
    });
  },
});

/** Archives an account (hidden from choices, history kept) or brings it back. */
export const setArchived = mutation({
  args: { id: v.string(), archived: v.boolean() },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const account = await ownAccount(ctx, ownerId, args.id);
    await ctx.db.patch(account._id, { archived: args.archived, updatedAt: Date.now() });
  },
});

/**
 * Deletes an account, only if nothing was ever recorded in it (no
 * transaction, no transfer in or out), so no history is ever lost; an
 * account with history can be archived instead (PRD 8).
 */
export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const account = await ownAccount(ctx, ownerId, args.id);
    const used =
      (await ctx.db
        .query("transactions")
        .withIndex("by_owner_account", (q) => q.eq("ownerId", ownerId).eq("accountId", account._id))
        .first()) ??
      (await ctx.db
        .query("transactions")
        .withIndex("by_owner_toAccount", (q) => q.eq("ownerId", ownerId).eq("toAccountId", account._id))
        .first());
    if (used) {
      throw new ConvexError(`${account.name} has transactions, so it can only be archived.`);
    }
    // A goal that followed it goes back to counting its own entries.
    const goals = await ctx.db
      .query("goals")
      .withIndex("by_owner_account", (q) => q.eq("ownerId", ownerId).eq("accountId", account._id))
      .collect();
    for (const goal of goals) await ctx.db.patch(goal._id, { accountId: undefined, updatedAt: Date.now() });
    await ctx.db.delete(account._id);
  },
});

/**
 * The user's own account with this id, in `currency`, or a refusal. The id
 * comes from the browser, so it's checked: it must be a real account id, it
 * must belong to the signed-in user, and a transaction must be in the
 * account's own currency (balances never mix currencies).
 */
export async function ownedAccount(
  ctx: QueryCtx,
  ownerId: string,
  id: string,
  currency: string,
): Promise<Doc<"accounts">> {
  const account = await ownAccount(ctx, ownerId, id);
  if (account.currency !== currency) {
    throw new ConvexError(`${account.name} is in ${account.currency}, not ${currency}.`);
  }
  return account;
}

/**
 * The account that money in `currency` goes to when none was chosen: the
 * user's oldest open account in that currency, made if there's none. A
 * made one is "Main account", or "Main account (EUR)" once the user has
 * more than one currency, in which case an untouched "Main account" in
 * another currency is renamed the same way so the names stay apart.
 */
export async function defaultAccountFor(
  ctx: MutationCtx,
  ownerId: string,
  currency: string,
): Promise<Doc<"accounts">> {
  const accounts = await ctx.db
    .query("accounts")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .collect();
  const existing = accounts.find((a) => a.currency === currency && !a.archived);
  if (existing) return existing;

  const currencies = new Set([...accounts.map((a) => a.currency), currency]);
  for (const account of accounts) {
    if (account.name === defaultAccountName(account.currency, 1) && currencies.size > 1) {
      await ctx.db.patch(account._id, {
        name: defaultAccountName(account.currency, currencies.size),
        updatedAt: Date.now(),
      });
    }
  }
  const id = await ctx.db.insert("accounts", {
    ownerId,
    name: defaultAccountName(currency, currencies.size),
    type: "bank",
    currency,
    opening: null,
    archived: false,
    updatedAt: Date.now(),
  });
  return (await ctx.db.get(id))!;
}

/** How many transactions one ensureAccounts call assigns. */
const ASSIGN_BATCH_SIZE = 200;

/**
 * Moves a user from before accounts to accounts, safely and repeatably:
 *
 * 1. The starting balance from Settings becomes the starting balance of
 *    an account in its currency (made if needed), once: settings remember
 *    it was moved, and an account that already has one keeps it.
 * 2. Transactions without an account are given the account of their
 *    currency, a batch at a time; `more` says to call again.
 *
 * Running it again does nothing new, so it can run on every visit.
 */
export const ensureAccounts = mutation({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireOwner(ctx);
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .unique();

    let movedOpening = false;
    if (settings?.openingBalance && !settings.openingMoved) {
      const { amountMinor, currency, date } = settings.openingBalance;
      const account = await defaultAccountFor(ctx, ownerId, currency);
      if (account.opening === null) {
        await ctx.db.patch(account._id, { opening: { amountMinor, date }, updatedAt: Date.now() });
        movedOpening = true;
      }
      await ctx.db.patch(settings._id, { openingMoved: true, updatedAt: Date.now() });
    }

    const unassigned = await ctx.db
      .query("transactions")
      .withIndex("by_owner_account", (q) => q.eq("ownerId", ownerId).eq("accountId", undefined))
      .take(ASSIGN_BATCH_SIZE);
    const byCurrency = new Map<string, Id<"accounts">>();
    for (const transaction of unassigned) {
      let accountId = byCurrency.get(transaction.currency);
      if (!accountId) {
        accountId = (await defaultAccountFor(ctx, ownerId, transaction.currency))._id;
        byCurrency.set(transaction.currency, accountId);
      }
      await ctx.db.patch(transaction._id, { accountId });
    }
    return {
      movedOpening,
      assigned: unassigned.length,
      more: unassigned.length === ASSIGN_BATCH_SIZE,
    };
  },
});
