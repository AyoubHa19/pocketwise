// @vitest-environment edge-runtime
// Runs in an environment close to Convex's own, against an in-memory copy
// of the backend, so nothing touches the real deployment.
/// <reference types="vite/client" />
// (import.meta.glob below is a Vite feature, which that line describes.)
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import type { Transaction } from "../src/lib/transactions";
import { api } from "./_generated/api";
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
    expect(await sarah.query(api.transactions.list, {})).toEqual([coffee]);
  });

  it("updates a transaction saved again with the same id, instead of copying it", async () => {
    const { sarah } = setup();
    await sarah.mutation(api.transactions.save, { transaction: coffee });
    const edited = { ...coffee, amount: { amountMinor: 500, currency: "EUR" }, note: undefined };
    await sarah.mutation(api.transactions.save, { transaction: edited });
    const list = await sarah.query(api.transactions.list, {});
    expect(list).toHaveLength(1);
    // The removed note is really gone, not kept from before.
    expect(list[0]).toEqual({ id: "coffee-1", type: "expense", amount: { amountMinor: 500, currency: "EUR" }, category: "Food", date: "2026-10-13" });
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
    expect(await sarah.query(api.transactions.list, {})).toEqual([]);
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
    expect(await sarah.query(api.transactions.list, {})).toEqual([]);
  });
});

describe("one user's data is invisible and untouchable to another", () => {
  it("doesn't show Sarah's transactions to Lee", async () => {
    const { sarah, lee } = setup();
    await sarah.mutation(api.transactions.save, { transaction: coffee });
    expect(await lee.query(api.transactions.list, {})).toEqual([]);
  });

  it("doesn't let Lee overwrite Sarah's transaction, even with its id", async () => {
    const { sarah, lee } = setup();
    await sarah.mutation(api.transactions.save, { transaction: coffee });
    const forged = { ...coffee, amount: { amountMinor: 999999, currency: "EUR" } };
    await lee.mutation(api.transactions.save, { transaction: forged });
    // Sarah's is unchanged; Lee only made a transaction of his own.
    expect(await sarah.query(api.transactions.list, {})).toEqual([coffee]);
    expect(await lee.query(api.transactions.list, {})).toEqual([forged]);
  });

  it("doesn't let Lee delete Sarah's transaction", async () => {
    const { sarah, lee } = setup();
    await sarah.mutation(api.transactions.save, { transaction: coffee });
    expect(await lee.mutation(api.transactions.remove, { id: "coffee-1" })).toBe(false);
    expect(await sarah.query(api.transactions.list, {})).toEqual([coffee]);
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
    expect(await sarah.query(api.transactions.list, {})).toEqual([edited]);
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
    expect(await sarah.query(api.transactions.list, {})).toEqual([]);
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
    expect(await lee.query(api.transactions.list, {})).toEqual([]);
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
  it("deletes the user's transactions and settings, and nothing of anyone else's", async () => {
    const { sarah, lee } = setup();
    await sarah.mutation(api.transactions.save, { transaction: coffee });
    await sarah.mutation(api.settings.setCurrency, { currency: "EUR" });
    await lee.mutation(api.transactions.save, { transaction: coffee });
    await lee.mutation(api.settings.setCurrency, { currency: "MAD" });

    expect(await sarah.mutation(api.account.deleteMyData, {})).toEqual({ deleted: 1, more: false });

    expect(await sarah.query(api.transactions.list, {})).toEqual([]);
    expect(await sarah.query(api.settings.get, {})).toEqual({ currency: null, openingBalance: null });
    // Lee's data is untouched.
    expect(await lee.query(api.transactions.list, {})).toEqual([coffee]);
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
    expect(await sarah.query(api.transactions.list, {})).toEqual([]);
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
  it("start as the device's theme and day-first dates", async () => {
    const { sarah } = setup();
    expect(await sarah.query(api.preferences.get, {})).toEqual({ theme: "system", dateOrder: "day-first" });
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
    expect(await sarah.query(api.preferences.get, {})).toEqual({ theme: "dark", dateOrder: "month-first" });
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
