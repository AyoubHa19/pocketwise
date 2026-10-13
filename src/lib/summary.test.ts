import { describe, expect, it } from "vitest";
import {
  accountBalance,
  currenciesLeftOut,
  groupByDay,
  isOpeningBalance,
  monthlyTotals,
  percentOfIncomeSpent,
  spendingByCategory,
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

describe("groupByDay", () => {
  const october = transactionsInMonth(transactions, "2026-10");

  it("makes one group per day, newest day first", () => {
    expect(groupByDay(october).map((day) => day.date)).toEqual([
      "2026-10-31",
      "2026-10-20",
      "2026-10-15",
      "2026-10-03",
      "2026-10-01",
    ]);
  });

  it("keeps a day's transactions in the order they were given", () => {
    const lastDay = groupByDay(october)[0];
    expect(lastDay.transactions.map((t) => t.id)).toEqual(["oct-31a", "oct-31b"]);
  });

  it("adds up each day: income minus spending, exactly", () => {
    const days = groupByDay([
      transaction("a", "income", 250000, "EUR", "2026-10-01"),
      transaction("b", "expense", 6345, "EUR", "2026-10-01"),
      transaction("c", "expense", 10, "EUR", "2026-10-01"),
      transaction("d", "expense", 20, "EUR", "2026-10-01"),
    ]);
    expect(days[0].netByCurrency).toEqual([{ currency: "EUR", netMinor: 243625 }]);
  });

  it("keeps currencies apart within a day", () => {
    const days = groupByDay([
      transaction("a", "expense", 1999, "USD", "2026-10-15"),
      transaction("b", "expense", 1500, "JPY", "2026-10-15"),
      transaction("c", "expense", 1, "USD", "2026-10-15"),
    ]);
    expect(days[0].netByCurrency).toEqual([
      { currency: "USD", netMinor: -2000 },
      { currency: "JPY", netMinor: -1500 },
    ]);
  });

  it("has no groups when there are no transactions", () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe("accountBalance", () => {
  const opening = { amountMinor: 300000, currency: "AED", date: "2026-10-01" };
  const today = "2026-10-13";

  it("adds the transactions from the opening day up to today", () => {
    const list = [
      transaction("a", "expense", 50000, "AED", "2026-10-01"), // the opening day counts
      transaction("b", "income", 900000, "AED", "2026-10-05"),
      transaction("c", "expense", 20000, "AED", "2026-10-13"), // today counts
    ];
    expect(accountBalance(list, opening, today)).toBe(300000 - 50000 + 900000 - 20000);
  });

  it("leaves out what was already in the opening balance, and the future", () => {
    const list = [
      transaction("before", "expense", 99999, "AED", "2026-09-30"),
      transaction("future", "expense", 99999, "AED", "2026-10-14"),
    ];
    expect(accountBalance(list, opening, today)).toBe(300000);
  });

  it("leaves out other currencies", () => {
    const list = [transaction("usd", "expense", 5000, "USD", "2026-10-05")];
    expect(accountBalance(list, opening, today)).toBe(300000);
  });

  it("can start from zero or an overdraft, and go below zero", () => {
    const overdraft = { ...opening, amountMinor: -10000 };
    const list = [transaction("a", "expense", 70000, "AED", "2026-10-02")];
    expect(accountBalance(list, overdraft, today)).toBe(-80000);
    expect(accountBalance([], { ...opening, amountMinor: 0 }, today)).toBe(0);
  });
});

describe("currenciesLeftOut", () => {
  const opening = { amountMinor: 300000, currency: "AED", date: "2026-10-01" };
  const today = "2026-10-13";

  it("names each other currency once, sorted by code", () => {
    const list = [
      transaction("a", "expense", 100, "USD", "2026-10-02"),
      transaction("b", "income", 100, "EUR", "2026-10-03"),
      transaction("c", "expense", 100, "USD", "2026-10-13"),
      transaction("d", "expense", 100, "AED", "2026-10-04"),
    ];
    expect(currenciesLeftOut(list, opening, today)).toEqual(["EUR", "USD"]);
  });

  it("ignores other currencies outside the balance's dates, like the balance does", () => {
    const list = [
      transaction("before", "expense", 100, "USD", "2026-09-30"),
      transaction("future", "expense", 100, "EUR", "2026-10-14"),
    ];
    expect(currenciesLeftOut(list, opening, today)).toEqual([]);
  });

  it("is empty when everything is in the balance's currency", () => {
    const list = [transaction("a", "expense", 100, "AED", "2026-10-02")];
    expect(currenciesLeftOut(list, opening, today)).toEqual([]);
  });
});

describe("isOpeningBalance", () => {
  it("accepts a complete opening balance, including a negative one", () => {
    expect(isOpeningBalance({ amountMinor: -500, currency: "AED", date: "2026-10-01" })).toBe(true);
  });

  it.each([
    [{ amountMinor: 1.5, currency: "AED", date: "2026-10-01" }],
    [{ amountMinor: "500", currency: "AED", date: "2026-10-01" }],
    [{ amountMinor: 500, currency: "aed", date: "2026-10-01" }],
    [{ amountMinor: 500, currency: "AED", date: "01/10/2026" }],
    [{ amountMinor: 500, currency: "AED" }],
    [null],
    ["3000"],
  ])("rejects %j", (value) => {
    expect(isOpeningBalance(value)).toBe(false);
  });
});

describe("spendingByCategory", () => {
  const t = (id: string, type: TransactionType, amountMinor: number, category: string, currency = "AED") => ({
    ...transaction(id, type, amountMinor, currency, "2026-10-05"),
    category,
  });

  it("adds up each category, biggest first, with its share", () => {
    const result = spendingByCategory(
      [
        t("a", "expense", 50000, "Rent"),
        t("b", "expense", 15000, "Food"),
        t("c", "expense", 5000, "Food"),
        t("d", "expense", 10000, "Transport"),
        t("e", "income", 900000, "Salary"),
      ],
      "AED",
    );
    expect(result).toEqual([
      { category: "Rent", amountMinor: 50000, percent: 63 },
      { category: "Food", amountMinor: 20000, percent: 25 },
      { category: "Transport", amountMinor: 10000, percent: 13 },
    ]);
  });

  it("leaves out income and other currencies", () => {
    const result = spendingByCategory(
      [t("a", "income", 5000, "Salary"), t("b", "expense", 5000, "Food", "USD")],
      "AED",
    );
    expect(result).toEqual([]);
  });

  it("orders equal amounts by name, so the order never jumps around", () => {
    const result = spendingByCategory(
      [t("a", "expense", 100, "Shopping"), t("b", "expense", 100, "Bills")],
      "AED",
    );
    expect(result.map((c) => c.category)).toEqual(["Bills", "Shopping"]);
  });

  it("gives one category all of the spending", () => {
    expect(spendingByCategory([t("a", "expense", 999, "Food")], "AED")[0].percent).toBe(100);
  });
});

describe("monthlyTotals", () => {
  const list = [
    transaction("aug", "income", 100000, "AED", "2026-08-01"),
    transaction("sep", "expense", 30000, "AED", "2026-09-15"),
    transaction("oct-in", "income", 500000, "AED", "2026-10-01"),
    transaction("oct-out", "expense", 70000, "AED", "2026-10-13"),
    transaction("oct-usd", "expense", 99999, "USD", "2026-10-02"),
    transaction("old", "expense", 99999, "AED", "2026-03-31"),
    transaction("future", "expense", 99999, "AED", "2026-11-01"),
  ];

  it("gives the months ending with the chosen one, oldest first, zeros included", () => {
    expect(monthlyTotals(list, "2026-10", 6, "AED")).toEqual([
      { month: "2026-05", incomeMinor: 0, spendingMinor: 0 },
      { month: "2026-06", incomeMinor: 0, spendingMinor: 0 },
      { month: "2026-07", incomeMinor: 0, spendingMinor: 0 },
      { month: "2026-08", incomeMinor: 100000, spendingMinor: 0 },
      { month: "2026-09", incomeMinor: 0, spendingMinor: 30000 },
      { month: "2026-10", incomeMinor: 500000, spendingMinor: 70000 },
    ]);
  });

  it("crosses into the previous year", () => {
    expect(monthlyTotals([], "2026-02", 4, "AED").map((m) => m.month)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });
});
