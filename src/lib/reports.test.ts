import { describe, expect, it } from "vitest";
import type { Budget } from "@/lib/budgets";
import type { Goal } from "@/lib/goals";
import type { RecurringRule } from "@/lib/recurring";
import {
  categoryComparison,
  compare,
  insights,
  percentChange,
  periodMonths,
  periodTotals,
  recurringPerMonth,
} from "@/lib/reports";
import type { Transaction } from "@/lib/transactions";

let n = 0;
const t = (date: string, amountMinor: number, over: Partial<Transaction> = {}): Transaction => ({
  id: `t${n++}`,
  type: "expense",
  amount: { amountMinor, currency: "MAD" },
  category: "Food",
  categoryId: "food",
  date,
  ...over,
});
const income = (date: string, amountMinor: number) => t(date, amountMinor, { type: "income", category: "Salary", categoryId: "salary" });

describe("periodMonths", () => {
  it("lists the months ending with the last one, oldest first", () => {
    expect(periodMonths("2026-02", 3)).toEqual(["2025-12", "2026-01", "2026-02"]);
    expect(periodMonths("2026-10", 1)).toEqual(["2026-10"]);
  });
});

describe("periodTotals", () => {
  it("adds up income, spending and what's left, with the share spent", () => {
    expect(
      periodTotals([
        { month: "2026-09", incomeMinor: 500000, spendingMinor: 200000 },
        { month: "2026-10", incomeMinor: 500000, spendingMinor: 400000 },
      ]),
    ).toEqual({ incomeMinor: 1000000, spendingMinor: 600000, netMinor: 400000, spentPercent: 60 });
  });

  it("has no share without income, and a negative net when more went out", () => {
    expect(periodTotals([{ month: "2026-10", incomeMinor: 0, spendingMinor: 5000 }])).toEqual({
      incomeMinor: 0,
      spendingMinor: 5000,
      netMinor: -5000,
      spentPercent: null,
    });
  });
});

describe("percentChange", () => {
  it("gives the rounded change, and null from nothing", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(100, 0)).toBeNull();
    expect(percentChange(-50, -100)).toBe(50);
  });
});

describe("compare", () => {
  it("puts a period beside the one before it, transfers and other currencies left out", () => {
    const list = [
      income("2026-10-01", 500000),
      t("2026-10-05", 100000),
      t("2026-10-06", 50000, { type: "transfer", category: "Transfer", categoryId: undefined, accountId: "a", toAccountId: "b" }),
      t("2026-10-07", 9999, { amount: { amountMinor: 9999, currency: "EUR" } }),
      income("2026-09-01", 400000),
      t("2026-09-05", 200000),
    ];
    const c = compare(list, "2026-10", 1, "MAD");
    expect(c.months).toEqual(["2026-10"]);
    expect(c.previousMonths).toEqual(["2026-09"]);
    expect(c.current).toEqual({ incomeMinor: 500000, spendingMinor: 100000, netMinor: 400000, spentPercent: 20 });
    expect(c.previous).toEqual({ incomeMinor: 400000, spendingMinor: 200000, netMinor: 200000, spentPercent: 50 });
  });
});

describe("categoryComparison", () => {
  it("lists each category's spending now and before, with its share and change", () => {
    const list = [
      t("2026-10-01", 30000),
      t("2026-10-02", 10000, { category: "Transport", categoryId: "transport" }),
      t("2026-09-01", 20000),
      t("2026-09-02", 5000, { category: "Gym", categoryId: "gym" }),
    ];
    expect(categoryComparison(list, ["2026-10"], ["2026-09"], "MAD")).toEqual([
      { category: "Food", currentMinor: 30000, previousMinor: 20000, percent: 75, change: 50 },
      { category: "Transport", currentMinor: 10000, previousMinor: 0, percent: 25, change: null },
      { category: "Gym", currentMinor: 0, previousMinor: 5000, percent: 0, change: -100 },
    ]);
  });
});

describe("recurringPerMonth", () => {
  const rule = (over: Partial<RecurringRule>): RecurringRule => ({
    id: "r",
    name: "R",
    type: "expense",
    amount: { amountMinor: 1200, currency: "MAD" },
    categoryId: "c",
    accountId: null,
    frequency: "monthly",
    startDate: "2026-01-01",
    endDate: null,
    trackFrom: "2026-01-01",
    paused: false,
    remindDays: 3,
    skipped: [],
    ...over,
  });

  it("averages each active item over a year, per month", () => {
    expect(
      recurringPerMonth(
        [
          rule({}),
          rule({ frequency: "weekly" }), // 1,200 × 52 ÷ 12 = 5,200
          rule({ frequency: "yearly" }), // 100
          rule({ type: "income", frequency: "biweekly" }), // 2,600
          rule({ paused: true }),
          rule({ endDate: "2026-05-01" }),
          rule({ amount: { amountMinor: 999, currency: "EUR" } }),
        ],
        "MAD",
        "2026-10-14",
      ),
    ).toEqual({ spendingMinor: 1200 + 5200 + 100, incomeMinor: 2600 });
  });
});

describe("insights", () => {
  const base = {
    budgets: [] as Budget[],
    categoryNames: new Map([["food", "Food"]]),
    goals: [] as Goal[],
    goalSaved: () => 0,
    rules: [] as RecurringRule[],
    currency: "MAD",
    today: "2026-10-14",
  };
  const run = (transactions: Transaction[], over: Partial<typeof base> = {}) => {
    const comparison = compare(transactions, "2026-10", 1, "MAD");
    return insights({
      ...base,
      ...over,
      transactions,
      comparison,
      categories: categoryComparison(transactions, comparison.months, comparison.previousMonths, "MAD"),
    });
  };

  it("says when a category that matters went up or down a lot, with the numbers", () => {
    const found = run([t("2026-10-01", 40000), t("2026-09-01", 20000)]);
    const food = found.find((i) => i.id === "category-Food")!;
    expect(food).toMatchObject({ tone: "watch", text: "You spent 100% more on Food than in the period before." });
    expect(food.how).toContain("MAD");
    expect(run([t("2026-10-01", 10000), t("2026-09-01", 20000)]).find((i) => i.id === "category-Food")?.tone).toBe("good");
  });

  it("stays quiet on small moves and without a previous period", () => {
    expect(run([t("2026-10-01", 21000), t("2026-09-01", 20000)])).toEqual([]);
    expect(run([t("2026-10-01", 40000)])).toEqual([]);
  });

  it("says when a budget went over, with spent and limit", () => {
    const budget: Budget = { id: "b", categoryId: "food", limit: { amountMinor: 30000, currency: "MAD" }, warnPercent: 80 };
    const found = run([t("2026-10-01", 40000)], { budgets: [budget] });
    expect(found[0]).toMatchObject({ id: "budget-b", tone: "watch" });
    expect(found[0].text).toContain("over its budget in October 2026");
  });

  it("compares a month's spending with the 3 months before, only with all 3", () => {
    const history = [t("2026-07-01", 10000), t("2026-08-01", 10000), t("2026-09-01", 10000)];
    expect(run([...history, t("2026-10-01", 20000)]).find((i) => i.id === "spending-swing")?.text).toBe(
      "Spending in October 2026 was 100% above your average of the 3 months before.",
    );
    expect(run([t("2026-08-01", 10000), t("2026-09-01", 10000), t("2026-10-01", 20000)]).find((i) => i.id === "spending-swing")).toBeUndefined();
  });

  it("flags a goal past its date, or needing more than has been left over", () => {
    const goal: Goal = { id: "g", name: "Trip", target: { amountMinor: 100000, currency: "MAD" }, targetDate: "2026-09-30", accountId: null, archived: false };
    expect(run([], { goals: [goal] })[0]).toMatchObject({ id: "goal-g", text: "Trip wasn't reached by its date." });
    const later = { ...goal, targetDate: "2026-11-30" };
    // (Intl puts a no-break space between the currency and the amount.)
    expect(run([income("2026-10-01", 1000)], { goals: [later] })[0].text.replace(/\s/g, " ")).toBe(
      "Trip needs MAD 500.00 a month, more than you've had left over on average lately.",
    );
  });
});
