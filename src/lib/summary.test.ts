import { describe, expect, it } from "vitest";
import {
  accountBalance,
  accountBalances,
  changePercent,
  currenciesLeftOut,
  groupByDay,
  isOpeningBalance,
  monthlyTotals,
  percentOfIncomeSpent,
  spendingByCategory,
  totalBalanceByCurrency,
  totalsByCurrency,
  transactionsInMonth,
} from "@/lib/summary";
import type { Account } from "@/lib/accounts";
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

describe("changePercent", () => {
  it("is the change from before, in whole percent, up or down", () => {
    expect(changePercent(112000, 100000)).toBe(12);
    expect(changePercent(92000, 100000)).toBe(-8);
    expect(changePercent(300499, 800)).toBe(37462);
    expect(changePercent(0, 5000)).toBe(-100);
    expect(changePercent(5000, 5000)).toBe(0);
  });

  it("has nothing to compare with when before was zero", () => {
    expect(changePercent(5000, 0)).toBeNull();
    expect(changePercent(0, 0)).toBeNull();
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

describe("transfers between your own accounts", () => {
  const cashToBank: Transaction = {
    id: "t1",
    type: "transfer",
    amount: { amountMinor: 50000, currency: "MAD" },
    category: "Transfer",
    date: "2026-10-05",
    accountId: "cash",
    toAccountId: "bank",
  };
  const coffee: Transaction = { ...transaction("c", "expense", 1500, "MAD", "2026-10-05"), accountId: "cash" };
  const salary: Transaction = { ...transaction("s", "income", 900000, "MAD", "2026-10-01"), accountId: "bank" };
  const list = [cashToBank, coffee, salary];

  it("aren't income or spending in the month's totals", () => {
    expect(totalsByCurrency(list, "MAD")).toEqual([
      { currency: "MAD", incomeMinor: 900000, spendingMinor: 1500, balanceMinor: 898500 },
    ]);
  });

  it("don't change a day's total", () => {
    const day = groupByDay(list).find((d) => d.date === "2026-10-05")!;
    expect(day.netByCurrency).toEqual([{ currency: "MAD", netMinor: -1500 }]);
    expect(day.transactions).toHaveLength(2); // still listed, just not counted
  });

  it("aren't spending by category", () => {
    expect(spendingByCategory(list, "MAD").map((c) => c.category)).toEqual(["Other"]);
  });

  it("aren't in the monthly chart", () => {
    const [october] = monthlyTotals(list, "2026-10", 1, "MAD");
    expect(october).toEqual({ month: "2026-10", incomeMinor: 900000, spendingMinor: 1500 });
  });

  it("leave the overall balance unchanged", () => {
    const opening = { amountMinor: 0, currency: "MAD", date: "2026-10-01" };
    expect(accountBalance(list, opening, "2026-10-13")).toBe(900000 - 1500);
  });
});

describe("accountBalances", () => {
  const account = (id: string, opening: Account["opening"], currency = "MAD"): Account => ({
    id,
    name: id,
    type: "bank",
    currency,
    opening,
    archived: false,
  });
  const today = "2026-10-13";
  const cash = account("cash", { amountMinor: 20000, date: "2026-10-01" });
  const bank = account("bank", { amountMinor: 100000, date: "2026-10-01" });
  const overdrawn = account("overdrawn", { amountMinor: -5000, date: "2026-10-01" });
  const unset = account("unset", null);
  const t = (over: Partial<Transaction>): Transaction => ({
    id: Math.random().toString(36),
    type: "expense",
    amount: { amountMinor: 1000, currency: "MAD" },
    category: "Food",
    date: "2026-10-05",
    ...over,
  });

  it("adds income and takes away spending in each account", () => {
    const balances = accountBalances(
      [cash, bank],
      [
        t({ accountId: "cash", amount: { amountMinor: 3000, currency: "MAD" } }),
        t({ accountId: "bank", type: "income", amount: { amountMinor: 50000, currency: "MAD" } }),
      ],
      today,
    );
    expect(balances.get("cash")).toBe(20000 - 3000);
    expect(balances.get("bank")).toBe(100000 + 50000);
  });

  it("moves a transfer out of one account and into the other", () => {
    const balances = accountBalances(
      [cash, bank],
      [t({ type: "transfer", category: "Transfer", accountId: "bank", toAccountId: "cash", amount: { amountMinor: 40000, currency: "MAD" } })],
      today,
    );
    expect(balances.get("bank")).toBe(100000 - 40000);
    expect(balances.get("cash")).toBe(20000 + 40000);
  });

  it("can start below zero and go further below (an overdraft)", () => {
    const balances = accountBalances([overdrawn], [t({ accountId: "overdrawn", amount: { amountMinor: 2500, currency: "MAD" } })], today);
    expect(balances.get("overdrawn")).toBe(-7500);
  });

  it("counts only from the starting day up to today", () => {
    const balances = accountBalances(
      [cash],
      [
        t({ accountId: "cash", date: "2026-09-30" }), // already in the starting balance
        t({ accountId: "cash", date: "2026-10-01" }), // the starting day counts
        t({ accountId: "cash", date: "2026-10-14" }), // not happened yet
      ],
      today,
    );
    expect(balances.get("cash")).toBe(20000 - 1000);
  });

  it("has no balance for an account without a starting balance", () => {
    const balances = accountBalances([unset], [t({ accountId: "unset" })], today);
    expect(balances.get("unset")).toBeNull();
  });

  it("ignores transactions of other accounts and in another currency", () => {
    const balances = accountBalances(
      [cash],
      [t({ accountId: "bank" }), t({ accountId: "cash", amount: { amountMinor: 1000, currency: "EUR" } }), t({})],
      today,
    );
    expect(balances.get("cash")).toBe(20000);
  });
});

describe("totalBalanceByCurrency", () => {
  const base = { type: "bank" as const, archived: false };
  it("adds up accounts per currency, skipping archived ones and those without a balance", () => {
    const accounts: Account[] = [
      { ...base, id: "a", name: "a", currency: "MAD", opening: { amountMinor: 0, date: "2026-10-01" } },
      { ...base, id: "b", name: "b", currency: "MAD", opening: { amountMinor: 0, date: "2026-10-01" } },
      { ...base, id: "c", name: "c", currency: "EUR", opening: { amountMinor: 0, date: "2026-10-01" } },
      { ...base, id: "d", name: "d", currency: "MAD", opening: { amountMinor: 0, date: "2026-10-01" }, archived: true },
      { ...base, id: "e", name: "e", currency: "MAD", opening: null },
    ];
    const balances = new Map<string, number | null>([["a", 100], ["b", -30], ["c", 500], ["d", 999], ["e", null]]);
    expect(totalBalanceByCurrency(accounts, balances)).toEqual([
      { currency: "EUR", amountMinor: 500 },
      { currency: "MAD", amountMinor: 70 },
    ]);
  });
});
