import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isTransaction,
  newTransactionId,
  removeTransaction,
  signedAmount,
  upsertTransaction,
  type Transaction,
} from "@/lib/transactions";

const groceries: Transaction = {
  id: "groceries",
  type: "expense",
  amount: { amountMinor: 1250, currency: "USD" },
  category: "Food",
  date: "2026-10-13",
};

const salary: Transaction = {
  id: "salary",
  type: "income",
  amount: { amountMinor: 250000, currency: "USD" },
  category: "Salary",
  date: "2026-10-01",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isTransaction", () => {
  it("accepts a complete transaction, with or without a note", () => {
    expect(isTransaction(groceries)).toBe(true);
    expect(isTransaction({ ...groceries, note: "Market" })).toBe(true);
  });

  it.each([
    ["an amount with decimals", { ...groceries, amount: { amountMinor: 12.5, currency: "USD" } }],
    ["an amount as text", { ...groceries, amount: { amountMinor: "1250", currency: "USD" } }],
    ["a negative amount", { ...groceries, amount: { amountMinor: -5, currency: "USD" } }],
    ["a zero amount", { ...groceries, amount: { amountMinor: 0, currency: "USD" } }],
    ["no amount", { ...groceries, amount: undefined }],
    ["an unknown type", { ...groceries, type: "gift" }],
    ["a date in another format", { ...groceries, date: "13/10/2026" }],
    ["no category", { ...groceries, category: undefined }],
    ["a note that isn't text", { ...groceries, note: 42 }],
    ["null", null],
    ["a string", "hello"],
  ])("rejects %s", (_description, value) => {
    expect(isTransaction(value)).toBe(false);
  });
});

describe("upsertTransaction", () => {
  const list = [groceries, salary];

  it("adds a new transaction at the start", () => {
    const rent = { ...groceries, id: "rent" };
    expect(upsertTransaction(list, rent).map((t) => t.id)).toEqual([
      "rent",
      "groceries",
      "salary",
    ]);
  });

  it("replaces a transaction with the same id, in place", () => {
    const edited = { ...salary, amount: { amountMinor: 999, currency: "USD" } };
    const result = upsertTransaction(list, edited);
    expect(result).toEqual([groceries, edited]);
  });

  it("leaves the original list unchanged", () => {
    upsertTransaction(list, { ...groceries, id: "new" });
    expect(list).toEqual([groceries, salary]);
  });
});

describe("removeTransaction", () => {
  it("removes the transaction with that id", () => {
    expect(removeTransaction([groceries, salary], "groceries")).toEqual([salary]);
  });

  it("changes nothing when no transaction has that id", () => {
    expect(removeTransaction([groceries, salary], "missing")).toEqual([
      groceries,
      salary,
    ]);
  });
});

describe("signedAmount", () => {
  it("makes expenses negative and keeps income positive", () => {
    expect(signedAmount(groceries)).toEqual({ amountMinor: -1250, currency: "USD" });
    expect(signedAmount(salary)).toEqual({ amountMinor: 250000, currency: "USD" });
  });
});

describe("newTransactionId", () => {
  it("gives a different id each time", () => {
    const ids = new Set(Array.from({ length: 100 }, () => newTransactionId()));
    expect(ids.size).toBe(100);
  });

  it("still works where crypto.randomUUID is missing (plain http)", () => {
    vi.stubGlobal("crypto", {});
    const first = newTransactionId();
    const second = newTransactionId();
    expect(first).toMatch(/^\d+-[a-z0-9]+$/);
    expect(first).not.toBe(second);
  });
});
