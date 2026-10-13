import { describe, expect, it } from "vitest";
import {
  percentOfIncomeSpent,
  totalsByCurrency,
  transactionsInMonth,
} from "@/lib/summary";
import type { Transaction, TransactionType } from "@/lib/transactions";

function transaction(
  id: string,
  type: TransactionType,
  amountMinor: number,
  currency: string,
  date: string,
): Transaction {
  return { id, type, amount: { amountMinor, currency }, category: "Other", date };
}

const transactions = [
  transaction("sep-30", "income", 9999, "MAD", "2026-09-30"),
  transaction("oct-01", "income", 1000000, "MAD", "2026-10-01"),
  transaction("oct-03", "expense", 4550, "MAD", "2026-10-03"),
  transaction("oct-15", "expense", 1999, "USD", "2026-10-15"),
  transaction("oct-20", "expense", 1500, "JPY", "2026-10-20"),
  transaction("oct-31a", "expense", 10, "MAD", "2026-10-31"),
  transaction("oct-31b", "expense", 20, "MAD", "2026-10-31"),
  transaction("nov-01", "expense", 100, "MAD", "2026-11-01"),
];

describe("transactionsInMonth", () => {
  it("keeps the first and last day of the month and nothing outside it", () => {
    const ids = transactionsInMonth(transactions, "2026-10").map((t) => t.id);
    expect(ids).toEqual(["oct-01", "oct-03", "oct-15", "oct-20", "oct-31a", "oct-31b"]);
  });

  it("finds nothing in a month without transactions", () => {
    expect(transactionsInMonth(transactions, "2025-01")).toEqual([]);
  });
});

describe("totalsByCurrency", () => {
  const october = transactionsInMonth(transactions, "2026-10");

  it("adds income and spending exactly in the main currency", () => {
    const [main] = totalsByCurrency(october, "MAD");
    expect(main).toEqual({
      currency: "MAD",
      incomeMinor: 1000000,
      spendingMinor: 4580, // 4550 + 10 + 20, with no rounding error
      balanceMinor: 995420,
    });
  });

  it("keeps other currencies apart, after the main one, sorted by code", () => {
    const totals = totalsByCurrency(october, "MAD");
    expect(totals.map((t) => t.currency)).toEqual(["MAD", "JPY", "USD"]);
    expect(totals[1]).toEqual({
      currency: "JPY",
      incomeMinor: 0,
      spendingMinor: 1500,
      balanceMinor: -1500,
    });
  });

  it("still lists the main currency, at zero, when the month is empty", () => {
    expect(totalsByCurrency([], "MAD")).toEqual([
      { currency: "MAD", incomeMinor: 0, spendingMinor: 0, balanceMinor: 0 },
    ]);
  });

  it("puts the main currency first even when it has no transactions", () => {
    const usdOnly = [transaction("a", "expense", 500, "USD", "2026-10-01")];
    expect(totalsByCurrency(usdOnly, "MAD").map((t) => t.currency)).toEqual([
      "MAD",
      "USD",
    ]);
  });
});

describe("percentOfIncomeSpent", () => {
  const totals = (incomeMinor: number, spendingMinor: number) => ({
    currency: "EUR",
    incomeMinor,
    spendingMinor,
    balanceMinor: incomeMinor - spendingMinor,
  });

  it.each([
    [240000, 98825, 41],
    [100, 50, 50],
    [300, 100, 33],
    [300, 200, 67],
    [100, 0, 0],
    [100, 100, 100],
    [1000000, 4580, 0], // 0.458% rounds down to 0
  ])("income %i and spending %i is %i%%", (income, spending, expected) => {
    expect(percentOfIncomeSpent(totals(income, spending))).toBe(expected);
  });

  it("goes over 100 when more was spent than came in", () => {
    expect(percentOfIncomeSpent(totals(50000, 96345))).toBe(193);
  });

  it("has nothing to compare with when there was no income", () => {
    expect(percentOfIncomeSpent(totals(0, 5000))).toBeNull();
    expect(percentOfIncomeSpent(totals(0, 0))).toBeNull();
  });
});
