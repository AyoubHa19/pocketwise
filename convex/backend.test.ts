// @vitest-environment edge-runtime
// Runs in an environment close to Convex's own, against an in-memory copy
// of the backend, so nothing touches the real deployment.
/// <reference types="vite/client" />
// (import.meta.glob below is a Vite feature, which that line describes.)
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import type { Transaction } from "../src/lib/transactions";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { isCalendarDate } from "./validation";

const modules = import.meta.glob("./**/*.ts");

function setup() {
  const t = convexTest(schema, modules);
  return {
    t,
    sarah: t.withIdentity({ name: "Sarah", tokenIdentifier: "test|sarah" }),
    lee: t.withIdentity({ name: "Lee", tokenIdentifier: "test|lee" }),
  };
}

/**
 * Transactions without the account and category ids the server gives them:
 * for the tests that are about other things.
 */
function plain(list: Transaction[]): Transaction[] {
  return list.map((t) => {
    const copy = { ...t };
    delete copy.accountId;
    delete copy.categoryId;
    return copy;
  });
}

/**
 * Transactions saved before accounts and categories existed, with neither:
 * written straight into the test database, since nothing saves them that
 * way now.
 */
async function legacy(t: ReturnType<typeof setup>["t"], ownerId: string, transactions: Transaction[]) {
  await t.run(async (ctx) => {
    for (const x of transactions) {
      await ctx.db.insert("transactions", {
        ownerId,
        clientId: x.id,
        type: x.type,
        amountMinor: x.amount.amountMinor,
        currency: x.amount.currency,
        category: x.category,
        date: x.date,
        updatedAt: 0,
      });
    }
  });
}

const coffee: Transaction = {
  id: "coffee-1",
  type: "expense",
  amount: { amountMinor: 450, currency: "EUR" },
  category: "Food",
  date: "2026-10-13",
  note: "Coffee",
};

describe("signed out", () => {
  it("can't read or change anything", async () => {
    const { t } = setup();
    const message = "You need to be signed in.";
    await expect(t.query(api.transactions.list, {})).rejects.toThrow(message);
    await expect(t.mutation(api.transactions.save, { transaction: coffee })).rejects.toThrow(message);
    await expect(t.mutation(api.transactions.remove, { id: "coffee-1" })).rejects.toThrow(message);
    await expect(t.query(api.settings.get, {})).rejects.toThrow(message);
    await expect(t.mutation(api.settings.setCurrency, { currency: "EUR" })).rejects.toThrow(message);
  });
});

describe("transactions", () => {
  it("gives back exactly what was saved", async () => {
    const { sarah } = setup();
    await sarah.mutation(api.transactions.save, { transaction: coffee });
    expect(plain(await sarah.query(api.transactions.list, {}))).toEqual([coffee]);
  });

  it("updates a transaction saved again with the same id, instead of copying it", async () => {
    const { sarah } = setup();
    await sarah.mutation(api.transactions.save, { transaction: coffee });
    const edited = { ...coffee, amount: { amountMinor: 500, currency: "EUR" }, note: undefined };
    await sarah.mutation(api.transactions.save, { transaction: edited });
    const list = await sarah.query(api.transactions.list, {});
    expect(list).toHaveLength(1);
    // The removed note is really gone, not kept from before.
    expect(plain(list)[0]).toEqual({ id: "coffee-1", type: "expense", amount: { amountMinor: 500, currency: "EUR" }, category: "Food", date: "2026-10-13" });
  });

  it("lists the newest day first, and the newest first within a day", async () => {
    const { sarah } = setup();
    const at = (id: string, date: string) => ({ ...coffee, id, date });
    await sarah.mutation(api.transactions.save, { transaction: at("old", "2026-09-01") });
    await sarah.mutation(api.transactions.save, { transaction: at("first-today", "2026-10-13") });
    await sarah.mutation(api.transactions.save, { transaction: at("second-today", "2026-10-13") });
    const ids = (await sarah.query(api.transactions.list, {})).map((x) => x.id);
    expect(ids).toEqual(["second-today", "first-today", "old"]);
  });

  it("deletes, and says whether there was anything to delete", async () => {
    const { sarah } = setup();
    await sarah.mutation(api.transactions.save, { transaction: coffee });
    expect(await sarah.mutation(api.transactions.remove, { id: "coffee-1" })).toBe(true);
    expect(await sarah.mutation(api.transactions.remove, { id: "coffee-1" })).toBe(false);
    expect(plain(await sarah.query(api.transactions.list, {}))).toEqual([]);
  });

  it.each([
    ["a zero amount", { amount: { amountMinor: 0, currency: "EUR" } }],
    ["a negative amount", { amount: { amountMinor: -450, currency: "EUR" } }],
    ["a fractional amount", { amount: { amountMinor: 4.5, currency: "EUR" } }],
    ["an unknown currency", { amount: { amountMinor: 450, currency: "XYZ" } }],
    ["a lowercase currency", { amount: { amountMinor: 450, currency: "eur" } }],
    ["an unknown category", { category: "Yachts" }],
    ["an impossible date", { date: "2026-02-30" }],
    ["a malformed date", { date: "13/10/2026" }],
    ["a note over 100 characters", { note: "x".repeat(101) }],
    ["an empty id", { id: "" }],
  ])("refuses %s, and saves nothing", async (_, change) => {
    const { sarah } = setup();
    await expect(
      sarah.mutation(api.transactions.save, { transaction: { ...coffee, ...change } }),
    ).rejects.toThrow();
    expect(plain(await sarah.query(api.transactions.list, {}))).toEqual([]);
  });
});

describe("one user's data is invisible and untouchable to another", () => {
  it("doesn't show Sarah's transactions to Lee", async () => {
    const { sarah, lee } = setup();
    await sarah.mutation(api.transactions.save, { transaction: coffee });
    expect(plain(await lee.query(api.transactions.list, {}))).toEqual([]);
  });

  it("doesn't let Lee overwrite Sarah's transaction, even with its id", async () => {
    const { sarah, lee } = setup();
    await sarah.mutation(api.transactions.save, { transaction: coffee });
    const forged = { ...coffee, amount: { amountMinor: 999999, currency: "EUR" } };
    await lee.mutation(api.transactions.save, { transaction: forged });
    // Sarah's is unchanged; Lee only made a transaction of his own.
    expect(plain(await sarah.query(api.transactions.list, {}))).toEqual([coffee]);
    expect(plain(await lee.query(api.transactions.list, {}))).toEqual([forged]);
  });

  it("doesn't let Lee delete Sarah's transaction", async () => {
    const { sarah, lee } = setup();
    await sarah.mutation(api.transactions.save, { transaction: coffee });
    expect(await lee.mutation(api.transactions.remove, { id: "coffee-1" })).toBe(false);
    expect(plain(await sarah.query(api.transactions.list, {}))).toEqual([coffee]);
  });

  it("keeps settings apart too", async () => {
    const { sarah, lee } = setup();
    await sarah.mutation(api.settings.setCurrency, { currency: "MAD" });
    expect(await lee.query(api.settings.get, {})).toEqual({ currency: null, openingBalance: null });
  });
});

describe("settings", () => {
  const balance = { amountMinor: 300000, currency: "MAD", date: "2026-05-01" };

  it("starts with nothing chosen", async () => {
    const { sarah } = setup();
    expect(await sarah.query(api.settings.get, {})).toEqual({ currency: null, openingBalance: null });
  });

  it("saves the currency and the starting balance without one erasing the other", async () => {
    const { sarah } = setup();
    await sarah.mutation(api.settings.setCurrency, { currency: "MAD" });
    await sarah.mutation(api.settings.setOpeningBalance, { openingBalance: balance });
    await sarah.mutation(api.settings.setCurrency, { currency: "EUR" });
    expect(await sarah.query(api.settings.get, {})).toEqual({ currency: "EUR", openingBalance: balance });
  });

  it("accepts an overdraft, and removes the balance with null", async () => {
    const { sarah } = setup();
    const overdraft = { ...balance, amountMinor: -25000 };
    await sarah.mutation(api.settings.setOpeningBalance, { openingBalance: overdraft });
    expect((await sarah.query(api.settings.get, {})).openingBalance).toEqual(overdraft);
    await sarah.mutation(api.settings.setOpeningBalance, { openingBalance: null });
    expect((await sarah.query(api.settings.get, {})).openingBalance).toBeNull();
  });

  it.each([
    ["an unknown currency", () => ({ currency: "XYZ" })],
  ])("refuses %s", async (_, args) => {
    const { sarah } = setup();
    await expect(sarah.mutation(api.settings.setCurrency, args())).rejects.toThrow();
    expect((await sarah.query(api.settings.get, {})).currency).toBeNull();
  });

  it.each([
    ["a fractional amount", { ...balance, amountMinor: 1.5 }],
    ["an unknown currency", { ...balance, currency: "XYZ" }],
    ["an impossible date", { ...balance, date: "2026-13-01" }],
  ])("refuses a starting balance with %s", async (_, openingBalance) => {
    const { sarah } = setup();
    await expect(
      sarah.mutation(api.settings.setOpeningBalance, { openingBalance }),
    ).rejects.toThrow();
    expect((await sarah.query(api.settings.get, {})).openingBalance).toBeNull();
  });
});

describe("moving browser data into the account", () => {
  const tea = { ...coffee, id: "tea-1", amount: { amountMinor: 300, currency: "EUR" }, note: "Tea" };

  it("adds every transaction, and says how many", async () => {
    const { sarah } = setup();
    const result = await sarah.mutation(api.transactions.importLocal, { transactions: [coffee, tea] });
    expect(result).toEqual({ added: 2, skipped: 0 });
    expect(await sarah.query(api.transactions.list, {})).toHaveLength(2);
  });

  it("can be retried without making copies", async () => {
    const { sarah } = setup();
    await sarah.mutation(api.transactions.importLocal, { transactions: [coffee, tea] });
    const again = await sarah.mutation(api.transactions.importLocal, { transactions: [coffee, tea] });
    expect(again).toEqual({ added: 0, skipped: 2 });
    expect(await sarah.query(api.transactions.list, {})).toHaveLength(2);
  });

  it("never overwrites a transaction already edited in the account", async () => {
    const { sarah } = setup();
    const edited = { ...coffee, amount: { amountMinor: 999, currency: "EUR" } };
    await sarah.mutation(api.transactions.save, { transaction: edited });
    await sarah.mutation(api.transactions.importLocal, { transactions: [coffee] });
    expect(plain(await sarah.query(api.transactions.list, {}))).toEqual([edited]);
  });

  it("skips a repeated id within the same batch", async () => {
    const { sarah } = setup();
    const result = await sarah.mutation(api.transactions.importLocal, { transactions: [coffee, coffee] });
    expect(result).toEqual({ added: 1, skipped: 1 });
  });

  it("saves nothing from a batch with one bad transaction", async () => {
    const { sarah } = setup();
    const bad = { ...tea, date: "2026-02-30" };
    await expect(
      sarah.mutation(api.transactions.importLocal, { transactions: [coffee, bad] }),
    ).rejects.toThrow();
    expect(plain(await sarah.query(api.transactions.list, {}))).toEqual([]);
  });

  it("refuses batches over 200", async () => {
    const { sarah } = setup();
    const many = Array.from({ length: 201 }, (_, i) => ({ ...coffee, id: `c-${i}` }));
    await expect(
      sarah.mutation(api.transactions.importLocal, { transactions: many }),
    ).rejects.toThrow("at most 200");
  });

  it("adds them to the signed-in user only", async () => {
    const { sarah, lee } = setup();
    await sarah.mutation(api.transactions.importLocal, { transactions: [coffee] });
    expect(plain(await lee.query(api.transactions.list, {}))).toEqual([]);
  });

  it("needs a sign-in", async () => {
    const { t } = setup();
    await expect(t.mutation(api.transactions.importLocal, { transactions: [coffee] })).rejects.toThrow(
      "You need to be signed in.",
    );
  });

  const balance = { amountMinor: 300000, currency: "MAD", date: "2026-05-01" };

  it("fills in the settings of an account that has none", async () => {
    const { sarah } = setup();
    const result = await sarah.mutation(api.settings.importLocal, { currency: "MAD", openingBalance: balance });
    expect(result).toEqual({ currency: true, openingBalance: true });
    expect(await sarah.query(api.settings.get, {})).toEqual({ currency: "MAD", openingBalance: balance });
  });

  it("keeps settings the account already has", async () => {
    const { sarah } = setup();
    await sarah.mutation(api.settings.setCurrency, { currency: "EUR" });
    const result = await sarah.mutation(api.settings.importLocal, { currency: "MAD", openingBalance: balance });
    expect(result).toEqual({ currency: false, openingBalance: true });
    expect(await sarah.query(api.settings.get, {})).toEqual({ currency: "EUR", openingBalance: balance });
  });

  it("saves neither setting if one is invalid", async () => {
    const { sarah } = setup();
    await expect(
      sarah.mutation(api.settings.importLocal, { currency: "MAD", openingBalance: { ...balance, date: "2026-13-01" } }),
    ).rejects.toThrow();
    expect(await sarah.query(api.settings.get, {})).toEqual({ currency: null, openingBalance: null });
  });
});

describe("deleting your data", () => {
  it("deletes the user's transactions, accounts, categories and settings, and nothing of anyone else's", async () => {
    const { sarah, lee } = setup();
    await sarah.mutation(api.transactions.save, { transaction: coffee });
    await sarah.mutation(api.settings.setCurrency, { currency: "EUR" });
    await lee.mutation(api.transactions.save, { transaction: coffee });
    await lee.mutation(api.settings.setCurrency, { currency: "MAD" });

    await sarah.mutation(api.accounts.create, { name: "Cash", type: "cash", currency: "EUR", opening: null });
    expect(await sarah.mutation(api.account.deleteMyData, {})).toEqual({ deleted: 1, more: false });

    expect(plain(await sarah.query(api.transactions.list, {}))).toEqual([]);
    expect(await sarah.query(api.accounts.list, {})).toEqual([]);
    expect(await sarah.query(api.categories.list, {})).toEqual([]);
    expect(await sarah.query(api.settings.get, {})).toEqual({ currency: null, openingBalance: null });
    // Lee's data is untouched.
    expect(plain(await lee.query(api.transactions.list, {}))).toEqual([coffee]);
    expect((await lee.query(api.settings.get, {})).currency).toBe("MAD");
  });

  it("works in batches for a large account, settings last", async () => {
    const { sarah } = setup();
    const many = Array.from({ length: 501 }, (_, i) => ({ ...coffee, id: `c-${i}` }));
    for (const batch of [many.slice(0, 200), many.slice(200, 400), many.slice(400)]) {
      await sarah.mutation(api.transactions.importLocal, { transactions: batch });
    }
    await sarah.mutation(api.settings.setCurrency, { currency: "EUR" });

    expect(await sarah.mutation(api.account.deleteMyData, {})).toEqual({ deleted: 500, more: true });
    // Not finished yet: the settings are still there.
    expect((await sarah.query(api.settings.get, {})).currency).toBe("EUR");
    expect(await sarah.mutation(api.account.deleteMyData, {})).toEqual({ deleted: 1, more: false });
    expect(plain(await sarah.query(api.transactions.list, {}))).toEqual([]);
    expect((await sarah.query(api.settings.get, {})).currency).toBeNull();
  });

  it("is fine to call with nothing left", async () => {
    const { sarah } = setup();
    expect(await sarah.mutation(api.account.deleteMyData, {})).toEqual({ deleted: 0, more: false });
  });

  it("needs a sign-in", async () => {
    const { t } = setup();
    await expect(t.mutation(api.account.deleteMyData, {})).rejects.toThrow("You need to be signed in.");
  });
});

describe("preferences", () => {
  it("start as the device's theme, day-first dates and weeks from Monday", async () => {
    const { sarah } = setup();
    expect(await sarah.query(api.preferences.get, {})).toEqual({ theme: "system", dateOrder: "day-first", weekStart: "monday" });
  });

  it("save the day weeks start on", async () => {
    const { sarah } = setup();
    await sarah.mutation(api.preferences.set, { weekStart: "saturday" });
    expect((await sarah.query(api.preferences.get, {})).weekStart).toBe("saturday");
    await expect(
      // @ts-expect-error: not a week start, on purpose
      sarah.mutation(api.preferences.set, { weekStart: "friday" }),
    ).rejects.toThrow();
  });

  it("accept dates as numbers", async () => {
    const { sarah } = setup();
    await sarah.mutation(api.preferences.set, { dateOrder: "numeric" });
    expect((await sarah.query(api.preferences.get, {})).dateOrder).toBe("numeric");
  });

  it("save one at a time, keeping the other and the settings", async () => {
    const { sarah } = setup();
    await sarah.mutation(api.settings.setCurrency, { currency: "MAD" });
    await sarah.mutation(api.preferences.set, { theme: "dark" });
    await sarah.mutation(api.preferences.set, { dateOrder: "month-first" });
    expect(await sarah.query(api.preferences.get, {})).toEqual({ theme: "dark", dateOrder: "month-first", weekStart: "monday" });
    expect((await sarah.query(api.settings.get, {})).currency).toBe("MAD");
  });

  it("don't erase preferences when the currency changes", async () => {
    const { sarah } = setup();
    await sarah.mutation(api.preferences.set, { theme: "light" });
    await sarah.mutation(api.settings.setCurrency, { currency: "EUR" });
    expect((await sarah.query(api.preferences.get, {})).theme).toBe("light");
  });

  it("refuse unknown values", async () => {
    const { sarah } = setup();
    await expect(
      // @ts-expect-error: not a theme, on purpose
      sarah.mutation(api.preferences.set, { theme: "neon" }),
    ).rejects.toThrow();
    expect((await sarah.query(api.preferences.get, {})).theme).toBe("system");
  });

  it("are each user's own", async () => {
    const { sarah, lee } = setup();
    await sarah.mutation(api.preferences.set, { theme: "dark" });
    expect((await lee.query(api.preferences.get, {})).theme).toBe("system");
  });

  it("need a sign-in", async () => {
    const { t } = setup();
    await expect(t.query(api.preferences.get, {})).rejects.toThrow("You need to be signed in.");
    await expect(t.mutation(api.preferences.set, { theme: "dark" })).rejects.toThrow("You need to be signed in.");
  });

  it("go when the account's data is deleted", async () => {
    const { sarah } = setup();
    await sarah.mutation(api.preferences.set, { theme: "dark" });
    await sarah.mutation(api.account.deleteMyData, {});
    expect((await sarah.query(api.preferences.get, {})).theme).toBe("system");
  });
});

describe("accounts", () => {
  const newAccount = { name: "Cash", type: "cash" as const, currency: "EUR", opening: null };

  it("are listed for their owner only", async () => {
    const { sarah, lee } = setup();
    await sarah.mutation(api.accounts.create, newAccount);
    expect((await sarah.query(api.accounts.list, {})).map((a) => a.name)).toEqual(["Cash"]);
    expect(await lee.query(api.accounts.list, {})).toEqual([]);
  });

  it.each([
    ["an empty name", { name: "   " }],
    ["a name over 40 characters", { name: "x".repeat(41) }],
    ["an unknown currency", { currency: "XYZ" }],
    ["a starting balance on an impossible day", { opening: { amountMinor: 0, date: "2026-02-30" } }],
    ["a fractional starting balance", { opening: { amountMinor: 1.5, date: "2026-10-01" } }],
  ])("refuse %s", async (_, change) => {
    const { sarah } = setup();
    await expect(sarah.mutation(api.accounts.create, { ...newAccount, ...change })).rejects.toThrow();
    expect(await sarah.query(api.accounts.list, {})).toEqual([]);
  });

  it("keep a transaction in the account it was saved in", async () => {
    const { sarah } = setup();
    const cash = await sarah.mutation(api.accounts.create, newAccount);
    await sarah.mutation(api.transactions.save, { transaction: { ...coffee, accountId: cash } });
    expect((await sarah.query(api.transactions.list, {}))[0].accountId).toBe(cash);
  });

  it("refuse someone else's account, and one in another currency", async () => {
    const { sarah, lee } = setup();
    const leesCash = await lee.mutation(api.accounts.create, newAccount);
    const madAccount = await sarah.mutation(api.accounts.create, { ...newAccount, currency: "MAD" });
    await expect(
      sarah.mutation(api.transactions.save, { transaction: { ...coffee, accountId: leesCash } }),
    ).rejects.toThrow("isn't one of yours");
    await expect(
      sarah.mutation(api.transactions.save, { transaction: { ...coffee, accountId: madAccount } }),
    ).rejects.toThrow("is in MAD");
    await expect(
      sarah.mutation(api.transactions.save, { transaction: { ...coffee, accountId: "not-an-id" } }),
    ).rejects.toThrow("isn't one of yours");
    expect(plain(await sarah.query(api.transactions.list, {}))).toEqual([]);
  });
});

describe("editing, archiving and deleting accounts", () => {
  const cashArgs = { name: "Cash", type: "cash" as const, currency: "EUR", opening: null };

  it("changes the name, type and starting balance, but never the currency", async () => {
    const { sarah } = setup();
    const id = await sarah.mutation(api.accounts.create, cashArgs);
    await sarah.mutation(api.accounts.update, { id, name: " Wallet ", type: "wallet", opening: { amountMinor: 500, date: "2026-10-01" } });
    expect((await sarah.query(api.accounts.list, {}))[0]).toMatchObject({
      name: "Wallet", type: "wallet", currency: "EUR", opening: { amountMinor: 500, date: "2026-10-01" },
    });
  });

  it("archives and brings back", async () => {
    const { sarah } = setup();
    const id = await sarah.mutation(api.accounts.create, cashArgs);
    await sarah.mutation(api.accounts.setArchived, { id, archived: true });
    expect((await sarah.query(api.accounts.list, {}))[0].archived).toBe(true);
    await sarah.mutation(api.accounts.setArchived, { id, archived: false });
    expect((await sarah.query(api.accounts.list, {}))[0].archived).toBe(false);
  });

  it("deletes an empty account", async () => {
    const { sarah } = setup();
    const id = await sarah.mutation(api.accounts.create, cashArgs);
    await sarah.mutation(api.accounts.remove, { id });
    expect(await sarah.query(api.accounts.list, {})).toEqual([]);
  });

  it("won't delete an account with history, either end of a transfer", async () => {
    const { sarah } = setup();
    const cash = await sarah.mutation(api.accounts.create, cashArgs);
    const bank = await sarah.mutation(api.accounts.create, { ...cashArgs, name: "Bank" });
    await sarah.mutation(api.transactions.save, {
      transaction: { id: "m", type: "transfer", amount: { amountMinor: 1, currency: "EUR" }, category: "Transfer", date: "2026-10-13", accountId: bank, toAccountId: cash },
    });
    await expect(sarah.mutation(api.accounts.remove, { id: cash })).rejects.toThrow("can only be archived");
    await expect(sarah.mutation(api.accounts.remove, { id: bank })).rejects.toThrow("can only be archived");
    expect(await sarah.query(api.accounts.list, {})).toHaveLength(2);
  });

  it("can't touch someone else's account", async () => {
    const { sarah, lee } = setup();
    const id = await lee.mutation(api.accounts.create, cashArgs);
    await expect(sarah.mutation(api.accounts.update, { id, name: "Mine", type: "cash", opening: null })).rejects.toThrow("isn't one of yours");
    await expect(sarah.mutation(api.accounts.setArchived, { id, archived: true })).rejects.toThrow("isn't one of yours");
    await expect(sarah.mutation(api.accounts.remove, { id })).rejects.toThrow("isn't one of yours");
    expect((await lee.query(api.accounts.list, {}))[0]).toMatchObject({ name: "Cash", archived: false });
  });
});

describe("transfers", () => {
  async function twoAccounts(user: ReturnType<typeof setup>["sarah"]) {
    const cash = await user.mutation(api.accounts.create, { name: "Cash", type: "cash", currency: "EUR", opening: null });
    const bank = await user.mutation(api.accounts.create, { name: "Bank", type: "bank", currency: "EUR", opening: null });
    return { cash, bank };
  }
  const transfer = (accountId: string, toAccountId: string) => ({
    id: "move-1",
    type: "transfer" as const,
    amount: { amountMinor: 20000, currency: "EUR" },
    category: "Transfer",
    date: "2026-10-13",
    accountId,
    toAccountId,
  });

  it("are saved between two of the user's accounts", async () => {
    const { sarah } = setup();
    const { cash, bank } = await twoAccounts(sarah);
    await sarah.mutation(api.transactions.save, { transaction: transfer(bank, cash) });
    expect(await sarah.query(api.transactions.list, {})).toEqual([transfer(bank, cash)]);
  });

  it("need two different accounts, both given", async () => {
    const { sarah } = setup();
    const { cash } = await twoAccounts(sarah);
    await expect(sarah.mutation(api.transactions.save, { transaction: transfer(cash, cash) })).rejects.toThrow();
    const oneEnded = { ...transfer(cash, cash), toAccountId: undefined };
    await expect(sarah.mutation(api.transactions.save, { transaction: oneEnded })).rejects.toThrow();
  });

  it("can't reach into someone else's account", async () => {
    const { sarah, lee } = setup();
    const { cash } = await twoAccounts(sarah);
    const leesBank = await lee.mutation(api.accounts.create, { name: "Bank", type: "bank", currency: "EUR", opening: null });
    await expect(sarah.mutation(api.transactions.save, { transaction: transfer(cash, leesBank) })).rejects.toThrow(
      "isn't one of yours",
    );
  });

  it("can't go between currencies yet", async () => {
    const { sarah } = setup();
    const { cash } = await twoAccounts(sarah);
    const mad = await sarah.mutation(api.accounts.create, { name: "MAD", type: "bank", currency: "MAD", opening: null });
    await expect(sarah.mutation(api.transactions.save, { transaction: transfer(cash, mad) })).rejects.toThrow("is in MAD");
  });

  it("aren't accepted from old browser data", async () => {
    const { sarah } = setup();
    const { cash, bank } = await twoAccounts(sarah);
    await expect(
      sarah.mutation(api.transactions.importLocal, { transactions: [transfer(cash, bank)] }),
    ).rejects.toThrow("can't name accounts");
  });
});

describe("every new transaction is in an account", () => {
  it("gets the account for its currency when none is chosen, made the first time", async () => {
    const { sarah } = setup();
    await sarah.mutation(api.transactions.save, { transaction: coffee });
    const [main] = await sarah.query(api.accounts.list, {});
    expect(main).toMatchObject({ name: "Main account", currency: "EUR", opening: null });
    expect((await sarah.query(api.transactions.list, {}))[0].accountId).toBe(main.id);
  });

  it("goes to an existing account of its currency rather than making one", async () => {
    const { sarah } = setup();
    const cash = await sarah.mutation(api.accounts.create, { name: "Cash", type: "cash", currency: "EUR", opening: null });
    await sarah.mutation(api.transactions.save, { transaction: coffee });
    expect((await sarah.query(api.transactions.list, {}))[0].accountId).toBe(cash);
    expect(await sarah.query(api.accounts.list, {})).toHaveLength(1);
  });

  it("includes what's moved in from the browser", async () => {
    const { sarah } = setup();
    await sarah.mutation(api.transactions.importLocal, { transactions: [coffee] });
    expect((await sarah.query(api.transactions.list, {}))[0].accountId).toBeDefined();
  });
});

describe("moving to accounts (ensureAccounts)", () => {
  const balance = { amountMinor: 300000, currency: "EUR", date: "2026-05-01" };

  it("makes a Main account with the starting balance and gives it every transaction", async () => {
    const { t, sarah } = setup();
    await sarah.mutation(api.settings.setOpeningBalance, { openingBalance: balance });
    await legacy(t, "test|sarah", [coffee, { ...coffee, id: "c2" }]);

    expect(await sarah.mutation(api.accounts.ensureAccounts, {})).toEqual({ movedOpening: true, assigned: 2, more: false });
    const [main] = await sarah.query(api.accounts.list, {});
    expect(main).toMatchObject({ name: "Main account", currency: "EUR", opening: { amountMinor: 300000, date: "2026-05-01" } });
    for (const t of await sarah.query(api.transactions.list, {})) expect(t.accountId).toBe(main.id);
  });

  it("does nothing new when run again", async () => {
    const { t, sarah } = setup();
    await sarah.mutation(api.settings.setOpeningBalance, { openingBalance: balance });
    await legacy(t, "test|sarah", [coffee]);
    await sarah.mutation(api.accounts.ensureAccounts, {});
    expect(await sarah.mutation(api.accounts.ensureAccounts, {})).toEqual({ movedOpening: false, assigned: 0, more: false });
    expect(await sarah.query(api.accounts.list, {})).toHaveLength(1);
  });

  it("makes one account per currency, named apart", async () => {
    const { t, sarah } = setup();
    await legacy(t, "test|sarah", [coffee, { ...coffee, id: "m1", amount: { amountMinor: 100, currency: "MAD" } }]);
    await sarah.mutation(api.accounts.ensureAccounts, {});
    const names = (await sarah.query(api.accounts.list, {})).map((a) => `${a.name}|${a.currency}`).sort();
    expect(names).toEqual(["Main account (EUR)|EUR", "Main account (MAD)|MAD"]);
  });

  it("puts old transactions in the account new ones already use", async () => {
    const { t, sarah } = setup();
    await sarah.mutation(api.transactions.save, { transaction: { ...coffee, id: "new" } });
    await legacy(t, "test|sarah", [coffee]);
    expect((await sarah.mutation(api.accounts.ensureAccounts, {})).assigned).toBe(1);
    const ids = new Set((await sarah.query(api.transactions.list, {})).map((x) => x.accountId));
    expect(ids.size).toBe(1);
    expect(await sarah.query(api.accounts.list, {})).toHaveLength(1);
  });

  it("keeps a starting balance the account already has", async () => {
    const { sarah } = setup();
    await sarah.mutation(api.accounts.create, {
      name: "Main account", type: "bank", currency: "EUR", opening: { amountMinor: 5, date: "2026-01-01" },
    });
    await sarah.mutation(api.settings.setOpeningBalance, { openingBalance: balance });
    expect((await sarah.mutation(api.accounts.ensureAccounts, {})).movedOpening).toBe(false);
    expect((await sarah.query(api.accounts.list, {}))[0].opening).toEqual({ amountMinor: 5, date: "2026-01-01" });
  });

  it("works in batches for a large history", async () => {
    const { t, sarah } = setup();
    await legacy(t, "test|sarah", Array.from({ length: 250 }, (_, i) => ({ ...coffee, id: `c-${i}` })));
    expect(await sarah.mutation(api.accounts.ensureAccounts, {})).toMatchObject({ assigned: 200, more: true });
    expect(await sarah.mutation(api.accounts.ensureAccounts, {})).toMatchObject({ assigned: 50, more: false });
  });

  it("touches only the signed-in user's data", async () => {
    const { t, sarah, lee } = setup();
    await legacy(t, "test|lee", [coffee]);
    await sarah.mutation(api.accounts.ensureAccounts, {});
    expect(await lee.query(api.accounts.list, {})).toEqual([]);
    expect((await lee.query(api.transactions.list, {}))[0].accountId).toBeUndefined();
  });

  it("needs a sign-in", async () => {
    const { t } = setup();
    await expect(t.mutation(api.accounts.ensureAccounts, {})).rejects.toThrow("You need to be signed in.");
    await expect(t.query(api.accounts.list, {})).rejects.toThrow("You need to be signed in.");
  });
});

describe("categories", () => {
  const kinds = (list: { name: string; kind: string }[], kind: string) =>
    list.filter((c) => c.kind === kind).map((c) => c.name);

  it("start as the default list, given on the first save", async () => {
    const { sarah } = setup();
    expect(await sarah.query(api.categories.list, {})).toEqual([]);
    await sarah.mutation(api.transactions.save, { transaction: coffee });
    const list = await sarah.query(api.categories.list, {});
    expect(kinds(list, "expense")).toEqual([
      "Housing", "Food", "Transport", "Bills", "Health", "Shopping", "Entertainment",
      "Education", "Travel", "Personal Care", "Subscriptions", "Debt Payments", "Other",
    ]);
    expect(kinds(list, "income")).toEqual(["Salary", "Freelance", "Business", "Investments", "Gifts", "Other Income"]);
    expect(list.every((c) => !c.archived)).toBe(true);
  });

  it("are given only once", async () => {
    const { sarah } = setup();
    await sarah.mutation(api.categories.ensureCategories, {});
    await sarah.mutation(api.categories.ensureCategories, {});
    await sarah.mutation(api.transactions.save, { transaction: coffee });
    expect(await sarah.query(api.categories.list, {})).toHaveLength(19);
  });

  it("link a saved transaction by id, found by name when none is sent", async () => {
    const { sarah } = setup();
    await sarah.mutation(api.transactions.save, { transaction: { ...coffee, category: "food " } });
    const food = (await sarah.query(api.categories.list, {})).find((c) => c.name === "Food")!;
    const [saved] = await sarah.query(api.transactions.list, {});
    expect(saved).toMatchObject({ category: "Food", categoryId: food.id });
  });

  it("refuse a name the user doesn't have, or one of the other kind", async () => {
    const { sarah } = setup();
    await expect(
      sarah.mutation(api.transactions.save, { transaction: { ...coffee, category: "Rent" } }),
    ).rejects.toThrow("Rent isn't one of your categories.");
    await expect(
      sarah.mutation(api.transactions.save, { transaction: { ...coffee, category: "Salary" } }),
    ).rejects.toThrow("Salary isn't one of your categories.");
    // (A refused save keeps nothing, not even the default list.)
    await sarah.mutation(api.categories.ensureCategories, {});
    const salary = (await sarah.query(api.categories.list, {})).find((c) => c.name === "Salary")!;
    await expect(
      sarah.mutation(api.transactions.save, { transaction: { ...coffee, categoryId: salary.id } }),
    ).rejects.toThrow("Salary is for income.");
  });

  it("are added, renamed everywhere at once, and archived without touching history", async () => {
    const { sarah } = setup();
    const pets = await sarah.mutation(api.categories.create, { name: "  Pets ", kind: "expense" });
    await sarah.mutation(api.transactions.save, { transaction: { ...coffee, category: "Pets", categoryId: pets } });
    await sarah.mutation(api.categories.rename, { id: pets, name: "Pet care" });
    expect((await sarah.query(api.transactions.list, {}))[0]).toMatchObject({ category: "Pet care", categoryId: pets });

    await sarah.mutation(api.categories.setArchived, { id: pets, archived: true });
    expect((await sarah.query(api.categories.list, {})).find((c) => c.id === pets)).toMatchObject({ name: "Pet care", archived: true });
    expect((await sarah.query(api.transactions.list, {}))[0].category).toBe("Pet care");
    // Editing a transaction in an archived category keeps it there.
    await sarah.mutation(api.transactions.save, { transaction: { ...coffee, category: "Pet care", categoryId: pets, note: "Vet" } });
    expect((await sarah.query(api.transactions.list, {}))[0]).toMatchObject({ categoryId: pets, note: "Vet" });
  });

  it("refuse an empty, too long, repeated or reserved name", async () => {
    const { sarah } = setup();
    const create = (name: string, kind: "expense" | "income" = "expense") =>
      sarah.mutation(api.categories.create, { name, kind });
    await expect(create("  ")).rejects.toThrow("Give the category a name.");
    await expect(create("x".repeat(31))).rejects.toThrow("up to 30 characters");
    await expect(create(" FOOD")).rejects.toThrow("There's already a spending category called Food.");
    await expect(create("transfer")).rejects.toThrow("Transfer is kept for transfers");
    // The same name is fine for the other kind.
    await create("Food", "income");
    const housing = (await sarah.query(api.categories.list, {})).find((c) => c.name === "Housing")!;
    await expect(sarah.mutation(api.categories.rename, { id: housing.id, name: "bills" })).rejects.toThrow("already");
    // Renaming to its own name in other letters is fine.
    await sarah.mutation(api.categories.rename, { id: housing.id, name: "HOUSING" });
  });

  it("can't be seen or changed by someone else", async () => {
    const { sarah, lee } = setup();
    const pets = await sarah.mutation(api.categories.create, { name: "Pets", kind: "expense" });
    expect((await lee.query(api.categories.list, {})).some((c) => c.id === pets)).toBe(false);
    await expect(lee.mutation(api.categories.rename, { id: pets, name: "Mine" })).rejects.toThrow("isn't one of yours");
    await expect(lee.mutation(api.categories.setArchived, { id: pets, archived: true })).rejects.toThrow("isn't one of yours");
    await expect(
      lee.mutation(api.transactions.save, { transaction: { ...coffee, categoryId: pets } }),
    ).rejects.toThrow("isn't one of yours");
    await expect(lee.mutation(api.categories.rename, { id: "nonsense", name: "x" })).rejects.toThrow("isn't one of yours");
  });

  it("are never on a transfer", async () => {
    const { sarah } = setup();
    const bank = await sarah.mutation(api.accounts.create, { name: "Bank", type: "bank", currency: "EUR", opening: null });
    const cash = await sarah.mutation(api.accounts.create, { name: "Cash", type: "cash", currency: "EUR", opening: null });
    const transfer = { ...coffee, id: "t1", type: "transfer" as const, category: "Transfer", accountId: bank, toAccountId: cash };
    await sarah.mutation(api.transactions.save, { transaction: transfer });
    const saved = (await sarah.query(api.transactions.list, {}))[0];
    expect(saved.categoryId).toBeUndefined();
    await sarah.mutation(api.categories.ensureCategories, {});
    const food = (await sarah.query(api.categories.list, {})).find((c) => c.name === "Food")!;
    await expect(
      sarah.mutation(api.transactions.save, { transaction: { ...transfer, categoryId: food.id } }),
    ).rejects.toThrow("isn't complete or valid");
  });

  it("are made for browser data with names the user doesn't have", async () => {
    const { sarah } = setup();
    await sarah.mutation(api.transactions.importLocal, {
      transactions: [{ ...coffee, category: "Rent" }, { ...coffee, id: "c2", category: "rent" }],
    });
    const rent = (await sarah.query(api.categories.list, {})).filter((c) => c.name.toLowerCase() === "rent");
    expect(rent).toMatchObject([{ name: "Rent", kind: "expense" }]);
    for (const x of await sarah.query(api.transactions.list, {})) expect(x.categoryId).toBe(rent[0].id);
    await expect(
      sarah.mutation(api.transactions.importLocal, { transactions: [{ ...coffee, id: "c3", categoryId: rent[0].id }] }),
    ).rejects.toThrow("can't name accounts or categories");
  });

  it("need a sign-in", async () => {
    const { t } = setup();
    const message = "You need to be signed in.";
    await expect(t.query(api.categories.list, {})).rejects.toThrow(message);
    await expect(t.mutation(api.categories.create, { name: "Pets", kind: "expense" })).rejects.toThrow(message);
    await expect(t.mutation(api.categories.ensureCategories, {})).rejects.toThrow(message);
  });
});

describe("moving to categories (ensureCategories)", () => {
  it("links old transactions by name and kind, making the ones the user doesn't have", async () => {
    const { t, sarah } = setup();
    await legacy(t, "test|sarah", [
      coffee,
      { ...coffee, id: "r", category: "Rent" },
      { ...coffee, id: "s", type: "income", category: "Salary" },
      // The fixed list allowed any category for either kind.
      { ...coffee, id: "o", type: "income", category: "Other" },
    ]);
    expect(await sarah.mutation(api.categories.ensureCategories, {})).toEqual({ linked: 4, more: false });
    const list = await sarah.query(api.categories.list, {});
    const id = (name: string, kind: string) => list.find((c) => c.name === name && c.kind === kind)?.id;
    expect(id("Rent", "expense")).toBeDefined();
    expect(id("Other", "income")).toBeDefined();
    const byClient = new Map((await sarah.query(api.transactions.list, {})).map((x) => [x.id, x.categoryId]));
    expect(byClient.get("coffee-1")).toBe(id("Food", "expense"));
    expect(byClient.get("r")).toBe(id("Rent", "expense"));
    expect(byClient.get("s")).toBe(id("Salary", "income"));
    expect(byClient.get("o")).toBe(id("Other", "income"));
    expect(list).toHaveLength(21);
  });

  it("does nothing new when run again", async () => {
    const { t, sarah } = setup();
    await legacy(t, "test|sarah", [coffee]);
    await sarah.mutation(api.categories.ensureCategories, {});
    expect(await sarah.mutation(api.categories.ensureCategories, {})).toEqual({ linked: 0, more: false });
  });

  it("works in batches for a large history", async () => {
    const { t, sarah } = setup();
    await legacy(t, "test|sarah", [
      ...Array.from({ length: 150 }, (_, i) => ({ ...coffee, id: `e-${i}` })),
      ...Array.from({ length: 100 }, (_, i) => ({ ...coffee, id: `i-${i}`, type: "income" as const, category: "Salary" })),
    ]);
    expect(await sarah.mutation(api.categories.ensureCategories, {})).toEqual({ linked: 200, more: true });
    expect(await sarah.mutation(api.categories.ensureCategories, {})).toEqual({ linked: 50, more: false });
    expect((await sarah.query(api.transactions.list, {})).every((x) => x.categoryId)).toBe(true);
  });

  it("touches only the signed-in user's data", async () => {
    const { t, sarah, lee } = setup();
    await legacy(t, "test|lee", [coffee]);
    await sarah.mutation(api.categories.ensureCategories, {});
    expect(await lee.query(api.categories.list, {})).toEqual([]);
    expect((await lee.query(api.transactions.list, {}))[0].categoryId).toBeUndefined();
  });
});

describe("descriptions and tags", () => {
  it("are saved and given back, trimmed, and removed when cleared", async () => {
    const { sarah } = setup();
    await sarah.mutation(api.transactions.save, {
      transaction: { ...coffee, description: "  Café Sam ", tags: ["work", "سفر"] },
    });
    expect((await sarah.query(api.transactions.list, {}))[0]).toMatchObject({
      description: "Café Sam",
      tags: ["work", "سفر"],
    });
    await sarah.mutation(api.transactions.save, { transaction: { ...coffee, description: " ", tags: [] } });
    const [saved] = await sarah.query(api.transactions.list, {});
    expect(saved.description).toBeUndefined();
    expect(saved.tags).toBeUndefined();
  });

  it("refuse a long description, and untidy, long or too many tags", async () => {
    const { sarah } = setup();
    const save = (over: Partial<Transaction>) =>
      sarah.mutation(api.transactions.save, { transaction: { ...coffee, ...over } });
    await expect(save({ description: "x".repeat(61) })).rejects.toThrow("up to 60 characters");
    await expect(save({ tags: ["trip", "TRIP"] })).rejects.toThrow("can't be empty or repeated");
    await expect(save({ tags: [""] })).rejects.toThrow("can't be empty or repeated");
    await expect(save({ tags: ["x".repeat(25)] })).rejects.toThrow("up to 24 characters");
    await expect(save({ tags: Array.from({ length: 11 }, (_, i) => `t${i}`) })).rejects.toThrow("up to 10 tags");
    expect(await sarah.query(api.transactions.list, {})).toEqual([]);
  });
});

describe("budgets", () => {
  async function food(user: ReturnType<typeof setup>["sarah"]) {
    await user.mutation(api.categories.ensureCategories, {});
    const list = await user.query(api.categories.list, {});
    return {
      food: list.find((c) => c.name === "Food")!.id,
      salary: list.find((c) => c.name === "Salary")!.id,
    };
  }
  const budget = (over: Record<string, unknown> = {}) => ({
    categoryId: null as string | null,
    limitMinor: 150000,
    currency: "EUR",
    warnPercent: 80,
    ...over,
  });

  it("are added, listed, changed and deleted", async () => {
    const { sarah } = setup();
    const { food: foodId } = await food(sarah);
    const id = await sarah.mutation(api.budgets.create, budget({ categoryId: foodId, name: "  Eating " }));
    expect(await sarah.query(api.budgets.list, {})).toEqual([
      { id, name: "Eating", categoryId: foodId, limit: { amountMinor: 150000, currency: "EUR" }, warnPercent: 80 },
    ]);
    // Changing it can also remove the name and the category.
    await sarah.mutation(api.budgets.update, { id, ...budget({ limitMinor: 90000, warnPercent: 50 }) });
    expect(await sarah.query(api.budgets.list, {})).toEqual([
      { id, categoryId: null, limit: { amountMinor: 90000, currency: "EUR" }, warnPercent: 50 },
    ]);
    await sarah.mutation(api.budgets.remove, { id });
    expect(await sarah.query(api.budgets.list, {})).toEqual([]);
  });

  it("refuse bad values, an income category, and a second budget for the same thing", async () => {
    const { sarah } = setup();
    const { food: foodId, salary } = await food(sarah);
    const create = (over: Record<string, unknown>) => sarah.mutation(api.budgets.create, budget(over));
    await expect(create({ limitMinor: 0 })).rejects.toThrow("greater than zero");
    await expect(create({ limitMinor: 12.5 })).rejects.toThrow("greater than zero");
    await expect(create({ warnPercent: 0 })).rejects.toThrow("warning level");
    await expect(create({ currency: "XYZ" })).rejects.toThrow("isn't a known currency");
    await expect(create({ categoryId: salary })).rejects.toThrow("is for income");
    await expect(create({ categoryId: "nonsense" })).rejects.toThrow("isn't one of yours");
    await create({ categoryId: foodId });
    await expect(create({ categoryId: foodId })).rejects.toThrow("already a budget for this category in EUR");
    // The same category in another currency is a different budget.
    await create({ categoryId: foodId, currency: "MAD" });
    expect(await sarah.query(api.budgets.list, {})).toHaveLength(2);
  });

  it("can't be seen, changed or deleted by someone else, nor use their categories", async () => {
    const { sarah, lee } = setup();
    const { food: foodId } = await food(sarah);
    const id = await sarah.mutation(api.budgets.create, budget());
    expect(await lee.query(api.budgets.list, {})).toEqual([]);
    await expect(lee.mutation(api.budgets.update, { id, ...budget() })).rejects.toThrow("isn't one of yours");
    await expect(lee.mutation(api.budgets.remove, { id })).rejects.toThrow("isn't one of yours");
    await expect(lee.mutation(api.budgets.create, budget({ categoryId: foodId }))).rejects.toThrow("isn't one of yours");
    expect(await sarah.query(api.budgets.list, {})).toHaveLength(1);
  });

  it("go when the user's data is deleted", async () => {
    const { sarah } = setup();
    await sarah.mutation(api.budgets.create, budget());
    await sarah.mutation(api.account.deleteMyData, {});
    expect(await sarah.query(api.budgets.list, {})).toEqual([]);
  });

  it("need a sign-in", async () => {
    const { t } = setup();
    await expect(t.query(api.budgets.list, {})).rejects.toThrow("You need to be signed in.");
    await expect(t.mutation(api.budgets.create, budget())).rejects.toThrow("You need to be signed in.");
  });
});

describe("savings goals", () => {
  const goal = (over: Record<string, unknown> = {}) => ({
    name: "Trip",
    targetMinor: 1000000,
    currency: "MAD",
    targetDate: "2027-06-30" as string | null,
    accountId: null as string | null,
    ...over,
  });
  const withoutCurrency = ({ name, targetMinor, targetDate, accountId }: ReturnType<typeof goal>) => ({
    name,
    targetMinor,
    targetDate,
    accountId,
  });

  it("are added, changed (never their currency), archived and listed", async () => {
    const { sarah } = setup();
    const id = await sarah.mutation(api.goals.create, goal({ name: "  Trip " }));
    // update takes no currency: Convex would refuse one.
    await sarah.mutation(api.goals.update, { id, ...withoutCurrency(goal({ targetMinor: 800000, targetDate: null })) });
    await sarah.mutation(api.goals.setArchived, { id, archived: true });
    expect(await sarah.query(api.goals.list, {})).toEqual([
      { id, name: "Trip", target: { amountMinor: 800000, currency: "MAD" }, targetDate: null, accountId: null, archived: true },
    ]);
  });

  it("refuse a missing name, a bad target, date or currency", async () => {
    const { sarah } = setup();
    const create = (over: Record<string, unknown>) => sarah.mutation(api.goals.create, goal(over));
    await expect(create({ name: " " })).rejects.toThrow("Give the goal a name");
    await expect(create({ targetMinor: 0 })).rejects.toThrow("greater than zero");
    await expect(create({ targetDate: "2027-02-30" })).rejects.toThrow("real target date");
    await expect(create({ currency: "XYZ" })).rejects.toThrow("isn't a known currency");
    expect(await sarah.query(api.goals.list, {})).toEqual([]);
  });

  it("note money in and out, never more out than in", async () => {
    const { sarah } = setup();
    const goalId = await sarah.mutation(api.goals.create, goal());
    const add = (amountMinor: number) =>
      sarah.mutation(api.goals.addContribution, { goalId, amountMinor, date: "2026-10-14", note: " first " });
    const first = await add(300000);
    await add(-50000);
    await expect(add(-250001)).rejects.toThrow("more than this goal has saved");
    await expect(add(0)).rejects.toThrow("greater than zero");
    const entries = await sarah.query(api.goals.contributions, {});
    expect(entries.map((e) => e.amountMinor)).toEqual([300000, -50000]);
    expect(entries[0].note).toBe("first");
    // Deleting the money put in would leave more out than in.
    await expect(sarah.mutation(api.goals.removeContribution, { id: first })).rejects.toThrow("Delete the money taken out first");
    await sarah.mutation(api.goals.removeContribution, { id: entries[1].id });
    await sarah.mutation(api.goals.removeContribution, { id: first });
    expect(await sarah.query(api.goals.contributions, {})).toEqual([]);
  });

  it("follow one of the user's accounts in their currency, and take no entries then", async () => {
    const { sarah, lee } = setup();
    const savings = await sarah.mutation(api.accounts.create, { name: "Savings", type: "savings", currency: "MAD", opening: null });
    const euros = await sarah.mutation(api.accounts.create, { name: "Euros", type: "bank", currency: "EUR", opening: null });
    const leeAccount = await lee.mutation(api.accounts.create, { name: "Lee's", type: "bank", currency: "MAD", opening: null });
    await expect(sarah.mutation(api.goals.create, goal({ accountId: euros }))).rejects.toThrow("is in EUR, not MAD");
    await expect(sarah.mutation(api.goals.create, goal({ accountId: leeAccount }))).rejects.toThrow("isn't one of yours");
    const goalId = await sarah.mutation(api.goals.create, goal({ accountId: savings }));
    await expect(
      sarah.mutation(api.goals.addContribution, { goalId, amountMinor: 100, date: "2026-10-14" }),
    ).rejects.toThrow("follows an account");
    // Deleting the account (never used) sends the goal back to its own entries.
    await sarah.mutation(api.accounts.remove, { id: savings });
    expect((await sarah.query(api.goals.list, {}))[0].accountId).toBeNull();
  });

  it("delete with their entries, and go with the user's data", async () => {
    const { sarah } = setup();
    const a = await sarah.mutation(api.goals.create, goal());
    const b = await sarah.mutation(api.goals.create, goal({ name: "Car" }));
    await sarah.mutation(api.goals.addContribution, { goalId: a, amountMinor: 100, date: "2026-10-14" });
    await sarah.mutation(api.goals.addContribution, { goalId: b, amountMinor: 200, date: "2026-10-14" });
    await sarah.mutation(api.goals.remove, { id: a });
    expect((await sarah.query(api.goals.contributions, {})).map((e) => e.amountMinor)).toEqual([200]);
    await sarah.mutation(api.account.deleteMyData, {});
    expect(await sarah.query(api.goals.list, {})).toEqual([]);
    expect(await sarah.query(api.goals.contributions, {})).toEqual([]);
  });

  it("can't be seen or touched by someone else", async () => {
    const { sarah, lee } = setup();
    const id = await sarah.mutation(api.goals.create, goal());
    const entry = await sarah.mutation(api.goals.addContribution, { goalId: id, amountMinor: 100, date: "2026-10-14" });
    expect(await lee.query(api.goals.list, {})).toEqual([]);
    expect(await lee.query(api.goals.contributions, {})).toEqual([]);
    await expect(lee.mutation(api.goals.update, { id, ...withoutCurrency(goal()) })).rejects.toThrow("isn't one of yours");
    await expect(lee.mutation(api.goals.remove, { id })).rejects.toThrow("isn't one of yours");
    await expect(lee.mutation(api.goals.addContribution, { goalId: id, amountMinor: 1, date: "2026-10-14" })).rejects.toThrow("isn't one of yours");
    await expect(lee.mutation(api.goals.removeContribution, { id: entry })).rejects.toThrow("isn't one of yours");
  });

  it("need a sign-in", async () => {
    const { t } = setup();
    await expect(t.query(api.goals.list, {})).rejects.toThrow("You need to be signed in.");
    await expect(t.mutation(api.goals.create, goal())).rejects.toThrow("You need to be signed in.");
  });
});

describe("recurring items", () => {
  // The server checks "today" against its own clock, so use the real one.
  const today = new Date().toISOString().slice(0, 10);
  async function ids(user: ReturnType<typeof setup>["sarah"]) {
    await user.mutation(api.categories.ensureCategories, {});
    const list = await user.query(api.categories.list, {});
    return {
      housing: list.find((c) => c.name === "Housing")!.id,
      salary: list.find((c) => c.name === "Salary")!.id,
    };
  }
  const rule = (categoryId: string, over: Record<string, unknown> = {}) => ({
    name: "Rent",
    type: "expense" as "income" | "expense",
    amountMinor: 500000,
    currency: "MAD",
    categoryId,
    accountId: null as string | null,
    frequency: "monthly" as const,
    startDate: "2020-01-01",
    endDate: null as string | null,
    remindDays: 3,
    today,
    ...over,
  });

  it("are added, listed from today (not years of missed dates), changed, paused and deleted", async () => {
    const { sarah } = setup();
    const { housing } = await ids(sarah);
    const id = await sarah.mutation(api.recurring.create, rule(housing, { name: " Rent " }));
    const [saved] = await sarah.query(api.recurring.list, {});
    expect(saved).toMatchObject({ id, name: "Rent", startDate: "2020-01-01", trackFrom: today, paused: false, skipped: [] });

    await sarah.mutation(api.recurring.update, { id, ...rule(housing, { amountMinor: 550000 }) });
    expect((await sarah.query(api.recurring.list, {}))[0]).toMatchObject({ amount: { amountMinor: 550000 }, trackFrom: today });

    await sarah.mutation(api.recurring.setPaused, { id, paused: true, today });
    expect((await sarah.query(api.recurring.list, {}))[0].paused).toBe(true);
    await sarah.mutation(api.recurring.setPaused, { id, paused: false, today });
    await sarah.mutation(api.recurring.remove, { id });
    expect(await sarah.query(api.recurring.list, {})).toEqual([]);
  });

  it("refuse bad values, the wrong kind of category, and a far-off 'today'", async () => {
    const { sarah } = setup();
    const { housing, salary } = await ids(sarah);
    const create = (over: Record<string, unknown>) => sarah.mutation(api.recurring.create, rule(housing, over));
    await expect(create({ name: "" })).rejects.toThrow("Give it a name");
    await expect(create({ amountMinor: -1 })).rejects.toThrow("greater than zero");
    await expect(create({ endDate: "2019-12-31" })).rejects.toThrow("before the first date");
    await expect(create({ remindDays: 99 })).rejects.toThrow("0 to 30 days");
    await expect(create({ categoryId: salary })).rejects.toThrow("Salary is for income");
    await expect(create({ today: "2001-01-01" })).rejects.toThrow("date looks wrong");
    expect(await sarah.query(api.recurring.list, {})).toEqual([]);
  });

  it("skip only real dates of the rule, and can bring them back", async () => {
    const { sarah } = setup();
    const { housing } = await ids(sarah);
    const start = today;
    const id = await sarah.mutation(api.recurring.create, rule(housing, { startDate: start, frequency: "weekly" }));
    await expect(sarah.mutation(api.recurring.setSkipped, { id, date: "2020-01-02", skip: true })).rejects.toThrow("isn't due on");
    await sarah.mutation(api.recurring.setSkipped, { id, date: start, skip: true });
    expect((await sarah.query(api.recurring.list, {}))[0].skipped).toEqual([start]);
    await sarah.mutation(api.recurring.setSkipped, { id, date: start, skip: false });
    expect((await sarah.query(api.recurring.list, {}))[0].skipped).toEqual([]);
  });

  it("record an occurrence once only, however many times it's saved", async () => {
    const { sarah } = setup();
    const { housing } = await ids(sarah);
    const id = await sarah.mutation(api.recurring.create, rule(housing));
    const occurrence = {
      id: `recurring-${id}-${today}`,
      type: "expense" as const,
      amount: { amountMinor: 500000, currency: "MAD" },
      category: "Housing",
      categoryId: housing,
      date: today,
      description: "Rent",
    };
    await sarah.mutation(api.transactions.save, { transaction: occurrence });
    await sarah.mutation(api.transactions.save, { transaction: { ...occurrence, amount: { amountMinor: 510000, currency: "MAD" } } });
    const list = await sarah.query(api.transactions.list, {});
    expect(list).toHaveLength(1);
    expect(list[0].amount.amountMinor).toBe(510000);
    // Deleting the rule leaves what it recorded.
    await sarah.mutation(api.recurring.remove, { id });
    expect(await sarah.query(api.transactions.list, {})).toHaveLength(1);
  });

  it("can't be seen or touched by someone else, nor use their account", async () => {
    const { sarah, lee } = setup();
    const { housing } = await ids(sarah);
    const leeAccount = await lee.mutation(api.accounts.create, { name: "Lee's", type: "bank", currency: "MAD", opening: null });
    await expect(sarah.mutation(api.recurring.create, rule(housing, { accountId: leeAccount }))).rejects.toThrow("isn't one of yours");
    const id = await sarah.mutation(api.recurring.create, rule(housing));
    expect(await lee.query(api.recurring.list, {})).toEqual([]);
    await expect(lee.mutation(api.recurring.setPaused, { id, paused: true, today })).rejects.toThrow("isn't one of yours");
    await expect(lee.mutation(api.recurring.remove, { id })).rejects.toThrow("isn't one of yours");
  });

  it("go when the user's data is deleted", async () => {
    const { sarah } = setup();
    const { housing } = await ids(sarah);
    await sarah.mutation(api.recurring.create, rule(housing));
    await sarah.mutation(api.account.deleteMyData, {});
    expect(await sarah.query(api.recurring.list, {})).toEqual([]);
  });

  it("need a sign-in", async () => {
    const { t } = setup();
    await expect(t.query(api.recurring.list, {})).rejects.toThrow("You need to be signed in.");
  });
});

describe("exchange rates", () => {
  const rate = (over: Record<string, string> = {}) => ({
    from: "EUR",
    to: "AED",
    rate: "4.2815",
    date: "2026-10-14",
    source: " My bank ",
    ...over,
  });

  it("are saved as typed, one per pair whichever way round, and deleted", async () => {
    const { sarah } = setup();
    await sarah.mutation(api.rates.save, rate());
    expect(await sarah.query(api.rates.list, {})).toMatchObject([
      { from: "EUR", to: "AED", rate: "4.2815", date: "2026-10-14", source: "My bank" },
    ]);
    // The same pair the other way round replaces it.
    const id = await sarah.mutation(api.rates.save, rate({ from: "AED", to: "EUR", rate: "0.2336" }));
    expect(await sarah.query(api.rates.list, {})).toMatchObject([{ id, from: "AED", to: "EUR" }]);
    await sarah.mutation(api.rates.save, rate({ from: "USD", rate: "3.6725" }));
    expect(await sarah.query(api.rates.list, {})).toHaveLength(2);
    await sarah.mutation(api.rates.remove, { id });
    expect((await sarah.query(api.rates.list, {})).map((r) => r.from)).toEqual(["USD"]);
  });

  it("refuse bad rates, the same currency twice, and unknown currencies", async () => {
    const { sarah } = setup();
    await expect(sarah.mutation(api.rates.save, rate({ rate: "0" }))).rejects.toThrow("greater than zero");
    await expect(sarah.mutation(api.rates.save, rate({ rate: "4.1234567" }))).rejects.toThrow("up to 6 decimals");
    await expect(sarah.mutation(api.rates.save, rate({ to: "EUR" }))).rejects.toThrow("two different");
    await expect(sarah.mutation(api.rates.save, rate({ from: "XYZ" }))).rejects.toThrow("Choose two currencies");
    await expect(sarah.mutation(api.rates.save, rate({ date: "2026-13-01" }))).rejects.toThrow("date the rate is from");
    expect(await sarah.query(api.rates.list, {})).toEqual([]);
  });

  it("are each user's own, and go with their data", async () => {
    const { sarah, lee } = setup();
    const id = await sarah.mutation(api.rates.save, rate());
    expect(await lee.query(api.rates.list, {})).toEqual([]);
    await expect(lee.mutation(api.rates.remove, { id })).rejects.toThrow("isn't one of yours");
    await sarah.mutation(api.account.deleteMyData, {});
    expect(await sarah.query(api.rates.list, {})).toEqual([]);
  });

  it("need a sign-in", async () => {
    const { t } = setup();
    await expect(t.query(api.rates.list, {})).rejects.toThrow("You need to be signed in.");
  });
});

describe("receipt scanning", () => {
  it("gives an upload URL to signed-in users only", async () => {
    const { t, sarah } = setup();
    expect(typeof (await sarah.mutation(api.receipts.generateUploadUrl, {}))).toBe("string");
    await expect(t.mutation(api.receipts.generateUploadUrl, {})).rejects.toThrow("You need to be signed in.");
  });

  it("caps scans per user per day", async () => {
    const { t } = setup();
    const count = (ownerId: string, day = "2026-10-14") => t.mutation(internal.receipts.countScan, { ownerId, day });
    for (let i = 1; i <= 30; i++) expect(await count("test|sarah")).toBe(i);
    await expect(count("test|sarah")).rejects.toThrow("up to 30 receipts a day");
    // Another user, and the next day, start from zero.
    expect(await count("test|lee")).toBe(1);
    expect(await count("test|sarah", "2026-10-15")).toBe(1);
  });

  it("answers that it isn't set up without an API key (a reply, not an error), and deletes the image anyway", async () => {
    const { t, sarah } = setup();
    const previous = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const storageId = await t.run((ctx) => ctx.storage.store(new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: "image/jpeg" })));
      expect(await sarah.action(api.receiptsNode.scan, { storageId })).toEqual({
        ok: false,
        message: "Receipt scanning isn't set up yet. You can still add the transaction by hand.",
      });
      expect(await t.run((ctx) => ctx.storage.get(storageId))).toBeNull();
    } finally {
      if (previous !== undefined) process.env.ANTHROPIC_API_KEY = previous;
    }
  });

  it("refuses a file that isn't an image, before any model call or count", async () => {
    const { t, sarah } = setup();
    const previous = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "test-key-never-used";
    try {
      const storageId = await t.run((ctx) => ctx.storage.store(new Blob(["%PDF-1.7 not a photo"], { type: "image/jpeg" })));
      expect(await sarah.action(api.receiptsNode.scan, { storageId })).toMatchObject({
        ok: false,
        message: expect.stringContaining("isn't a photo Pocketwise can read"),
      });
      expect(await t.run((ctx) => ctx.db.query("receiptScans").collect())).toEqual([]);
    } finally {
      if (previous === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = previous;
    }
  });

  it("needs a sign-in to scan", async () => {
    const { t } = setup();
    const storageId = await t.run((ctx) => ctx.storage.store(new Blob([new Uint8Array([0xff, 0xd8, 0xff])])));
    await expect(t.action(api.receiptsNode.scan, { storageId })).rejects.toThrow("You need to be signed in.");
  });
});

describe("the plan to payday", () => {
  const settings = (over: Record<string, unknown> = {}) => ({
    reserveMinor: 100000,
    savingsMinor: 50000,
    accountIds: null as string[] | null,
    salaryRuleId: null as string | null,
    payday: "2026-10-30" as string | null,
    ...over,
  });

  it("starts empty, and saves and reads back the settings", async () => {
    const { sarah } = setup();
    expect(await sarah.query(api.plan.get, {})).toEqual({
      reserveMinor: 0,
      savingsMinor: 0,
      accountIds: null,
      salaryRuleId: null,
      payday: null,
    });
    const bank = await sarah.mutation(api.accounts.create, { name: "Bank", type: "bank", currency: "AED", opening: null });
    await sarah.mutation(api.plan.set, settings({ accountIds: [bank, bank] }));
    expect(await sarah.query(api.plan.get, {})).toEqual(settings({ accountIds: [bank] }));
    await sarah.mutation(api.plan.set, settings({ reserveMinor: 0 }));
    expect((await sarah.query(api.plan.get, {})).reserveMinor).toBe(0);
  });

  it("takes only the user's own income rule as payday, and their own accounts", async () => {
    const { sarah, lee } = setup();
    await sarah.mutation(api.categories.ensureCategories, {});
    const list = await sarah.query(api.categories.list, {});
    const today = new Date().toISOString().slice(0, 10);
    const base = { amountMinor: 500000, currency: "AED", accountId: null, frequency: "monthly" as const, startDate: today, endDate: null, remindDays: 3, today };
    const salary = await sarah.mutation(api.recurring.create, { ...base, name: "Salary", type: "income", categoryId: list.find((c) => c.name === "Salary")!.id });
    const rent = await sarah.mutation(api.recurring.create, { ...base, name: "Rent", type: "expense", categoryId: list.find((c) => c.name === "Housing")!.id });
    await sarah.mutation(api.plan.set, settings({ salaryRuleId: salary, payday: null }));
    expect((await sarah.query(api.plan.get, {})).salaryRuleId).toBe(salary);
    await expect(sarah.mutation(api.plan.set, settings({ salaryRuleId: rent }))).rejects.toThrow("Rent isn't income");
    await expect(lee.mutation(api.plan.set, settings({ salaryRuleId: salary }))).rejects.toThrow("isn't one of yours");
    const leeAccount = await lee.mutation(api.accounts.create, { name: "Lee's", type: "bank", currency: "AED", opening: null });
    await expect(sarah.mutation(api.plan.set, settings({ accountIds: [leeAccount] }))).rejects.toThrow("isn't one of yours");
  });

  it("refuses negative or fractional amounts and impossible dates", async () => {
    const { sarah } = setup();
    await expect(sarah.mutation(api.plan.set, settings({ reserveMinor: -5 }))).rejects.toThrow("zero or more");
    await expect(sarah.mutation(api.plan.set, settings({ savingsMinor: 0.5 }))).rejects.toThrow("zero or more");
    await expect(sarah.mutation(api.plan.set, settings({ payday: "2026-13-01" }))).rejects.toThrow("real payday");
  });

  it("is each user's own, goes with their data, and needs a sign-in", async () => {
    const { t, sarah, lee } = setup();
    await sarah.mutation(api.plan.set, settings());
    expect((await lee.query(api.plan.get, {})).reserveMinor).toBe(0);
    await sarah.mutation(api.account.deleteMyData, {});
    expect((await sarah.query(api.plan.get, {})).payday).toBeNull();
    await expect(t.query(api.plan.get, {})).rejects.toThrow("You need to be signed in.");
  });
});

describe("debts", () => {
  const today = new Date().toISOString().slice(0, 10);
  const debt = (over: Record<string, unknown> = {}) => ({
    name: "Car loan",
    currency: "AED",
    balanceMinor: 1000000,
    balanceDate: today,
    paymentMinor: 100000,
    frequency: "monthly" as const,
    nextDue: null as string | null,
    annualRate: "12" as string | null,
    originalMinor: null as number | null,
    ruleId: null as string | null,
    today,
    ...over,
  });

  it("are added as entered, updated, archived and deleted", async () => {
    const { sarah } = setup();
    const id = await sarah.mutation(api.debts.create, debt({ name: " Car loan ", annualRate: " 12.5 " }));
    expect(await sarah.query(api.debts.list, {})).toMatchObject([{ id, name: "Car loan", annualRate: "12.5", archived: false }]);
    await sarah.mutation(api.debts.update, { id, ...debt({ balanceMinor: 900000, annualRate: null }) });
    expect((await sarah.query(api.debts.list, {}))[0]).toMatchObject({ balanceMinor: 900000, annualRate: null });
    await sarah.mutation(api.debts.setArchived, { id, archived: true });
    expect((await sarah.query(api.debts.list, {}))[0].archived).toBe(true);
    await sarah.mutation(api.debts.remove, { id });
    expect(await sarah.query(api.debts.list, {})).toEqual([]);
  });

  it("refuse bad values, never guessing a rate", async () => {
    const { sarah } = setup();
    const create = (over: Record<string, unknown>) => sarah.mutation(api.debts.create, debt(over));
    await expect(create({ balanceMinor: 0 })).rejects.toThrow("still owed");
    await expect(create({ paymentMinor: 1.5 })).rejects.toThrow("installment");
    await expect(create({ annualRate: "abc" })).rejects.toThrow("0 to 100");
    await expect(create({ currency: "XYZ" })).rejects.toThrow("isn't a known currency");
    await expect(create({ balanceDate: "2999-01-01" })).rejects.toThrow("today or earlier");
    expect(await sarah.query(api.debts.list, {})).toEqual([]);
  });

  it("can be paid through the user's own expense item in the same currency", async () => {
    const { sarah, lee } = setup();
    await sarah.mutation(api.categories.ensureCategories, {});
    const list = await sarah.query(api.categories.list, {});
    const base = { amountMinor: 100000, accountId: null, frequency: "monthly" as const, startDate: today, endDate: null, remindDays: 3, today };
    const debtCategory = list.find((c) => c.name === "Debt Payments")!.id;
    const loanRule = await sarah.mutation(api.recurring.create, { ...base, name: "Loan", type: "expense", currency: "AED", categoryId: debtCategory });
    const euroRule = await sarah.mutation(api.recurring.create, { ...base, name: "Euro loan", type: "expense", currency: "EUR", categoryId: debtCategory });
    const salary = await sarah.mutation(api.recurring.create, { ...base, name: "Salary", type: "income", currency: "AED", categoryId: list.find((c) => c.name === "Salary")!.id });
    await sarah.mutation(api.debts.create, debt({ ruleId: loanRule }));
    await expect(sarah.mutation(api.debts.create, debt({ ruleId: salary }))).rejects.toThrow("is income");
    await expect(sarah.mutation(api.debts.create, debt({ ruleId: euroRule }))).rejects.toThrow("is in EUR, not AED");
    await expect(lee.mutation(api.debts.create, debt({ ruleId: loanRule }))).rejects.toThrow("isn't one of yours");
  });

  it("are each user's own, go with their data, and need a sign-in", async () => {
    const { t, sarah, lee } = setup();
    const id = await sarah.mutation(api.debts.create, debt());
    expect(await lee.query(api.debts.list, {})).toEqual([]);
    await expect(lee.mutation(api.debts.remove, { id })).rejects.toThrow("isn't one of yours");
    await sarah.mutation(api.account.deleteMyData, {});
    expect(await sarah.query(api.debts.list, {})).toEqual([]);
    await expect(t.query(api.debts.list, {})).rejects.toThrow("You need to be signed in.");
  });
});

describe("isCalendarDate", () => {
  it.each(["2026-10-13", "2028-02-29", "2026-12-31", "2026-01-01"])("accepts %s", (date) => {
    expect(isCalendarDate(date)).toBe(true);
  });

  it.each(["2026-02-29", "2026-04-31", "2026-00-10", "2026-13-01", "2026-1-5", ""])(
    "refuses %j",
    (date) => {
      expect(isCalendarDate(date)).toBe(false);
    },
  );
});
