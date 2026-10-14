import { describe, expect, it } from "vitest";
import {
  budgetLabel,
  budgetProblem,
  budgetProgress,
  eligibleTransactions,
  type Budget,
} from "@/lib/budgets";
import type { Transaction } from "@/lib/transactions";

const t = (id: string, over: Partial<Transaction> = {}): Transaction => ({
  id,
  type: "expense",
  amount: { amountMinor: 10000, currency: "MAD" },
  category: "Food",
  categoryId: "food",
  date: "2026-10-10",
  ...over,
});

const food: Budget = { id: "b1", categoryId: "food", limit: { amountMinor: 50000, currency: "MAD" }, warnPercent: 80 };
const all: Budget = { ...food, id: "b2", categoryId: null };

const list = [
  t("lunch"),
  t("groceries", { amount: { amountMinor: 20000, currency: "MAD" } }),
  t("bus", { category: "Transport", categoryId: "transport" }),
  t("salary", { type: "income", category: "Salary", categoryId: "salary", amount: { amountMinor: 900000, currency: "MAD" } }),
  t("refund", { type: "income", category: "Other Income", categoryId: "other-income", amount: { amountMinor: 5000, currency: "MAD" } }),
  t("atm", { type: "transfer", category: "Transfer", categoryId: undefined, accountId: "a", toAccountId: "b" }),
  t("paris", { amount: { amountMinor: 3000, currency: "EUR" } }),
  t("september", { date: "2026-09-30" }),
];

describe("what counts against a budget", () => {
  it("is the month's expenses in its currency and category", () => {
    expect(eligibleTransactions(food, list, "2026-10").map((x) => x.id)).toEqual(["lunch", "groceries"]);
  });

  it("is every expense in its currency for all spending, but never income or transfers", () => {
    expect(eligibleTransactions(all, list, "2026-10").map((x) => x.id)).toEqual(["lunch", "groceries", "bus"]);
  });
});

describe("budgetProgress", () => {
  it("adds up the spending, what's left and the share used", () => {
    expect(budgetProgress(food, list, "2026-10")).toEqual({
      spentMinor: 30000,
      remainingMinor: 20000,
      percent: 60,
      state: "ok",
    });
  });

  it("starts fresh each month", () => {
    expect(budgetProgress(food, list, "2026-09").spentMinor).toBe(10000);
    expect(budgetProgress(food, list, "2026-11")).toMatchObject({ spentMinor: 0, percent: 0, state: "ok" });
  });

  it("warns from the chosen share, exactly, without rounding up", () => {
    const at = (amountMinor: number, warnPercent = 80) =>
      budgetProgress({ ...food, warnPercent }, [t("x", { amount: { amountMinor, currency: "MAD" } })], "2026-10").state;
    expect(at(39999)).toBe("ok"); // 79.998%
    expect(at(40000)).toBe("near"); // 80%
    expect(at(50000)).toBe("near"); // exactly the limit
    expect(at(50001)).toBe("over");
    expect(at(5000, 10)).toBe("near");
    expect(at(49999, 100)).toBe("ok");
  });

  it("shows the whole overspend, never hidden", () => {
    const over = budgetProgress(food, [t("x", { amount: { amountMinor: 65000, currency: "MAD" } })], "2026-10");
    expect(over).toEqual({ spentMinor: 65000, remainingMinor: -15000, percent: 130, state: "over" });
  });

  it("doesn't divide by zero on a bad limit", () => {
    const zero = { ...food, limit: { amountMinor: 0, currency: "MAD" } };
    expect(budgetProgress(zero, [], "2026-10")).toMatchObject({ percent: 0, state: "ok" });
    expect(budgetProgress(zero, list, "2026-10")).toMatchObject({ percent: 0, state: "over" });
  });
});

describe("budgetLabel", () => {
  const names = new Map([["food", "Food"]]);

  it("is the name, else the category's, else All spending", () => {
    expect(budgetLabel({ ...food, name: "Eating out" }, names)).toBe("Eating out");
    expect(budgetLabel(food, names)).toBe("Food");
    expect(budgetLabel(all, names)).toBe("All spending");
  });
});

describe("budgetProblem", () => {
  const values = (over: Partial<Budget> = {}): Omit<Budget, "id"> => {
    const budget: Partial<Budget> = { ...food, ...over };
    delete budget.id;
    return budget as Omit<Budget, "id">;
  };

  it("accepts a good budget", () => {
    expect(budgetProblem(values(), [])).toBeNull();
    expect(budgetProblem(values({ warnPercent: 1 }), [])).toBeNull();
    expect(budgetProblem(values({ warnPercent: 100 }), [])).toBeNull();
  });

  it("refuses a limit of zero or less, or not whole", () => {
    for (const amountMinor of [0, -5, 1.5, Number.NaN]) {
      expect(budgetProblem(values({ limit: { amountMinor, currency: "MAD" } }), [])).toMatch("greater than zero");
    }
  });

  it("refuses a warning level outside 1 to 100", () => {
    for (const warnPercent of [0, 101, 50.5, Number.NaN]) {
      expect(budgetProblem(values({ warnPercent }), [])).toMatch("warning level");
    }
  });

  it("refuses a long name", () => {
    expect(budgetProblem(values({ name: "x".repeat(41) }), [])).toMatch("up to 40");
  });

  it("allows one budget per category, or for all spending, in each currency", () => {
    expect(budgetProblem(values(), [values()])).toMatch("already a budget for this category in MAD");
    expect(budgetProblem(values({ categoryId: null }), [values({ categoryId: null })])).toMatch(
      "already a budget for all spending in MAD",
    );
    expect(budgetProblem(values(), [values({ categoryId: null })])).toBeNull();
    expect(budgetProblem(values({ limit: { amountMinor: 900, currency: "EUR" } }), [values()])).toBeNull();
  });
});
