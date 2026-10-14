import { describe, expect, it } from "vitest";
import type { Debt } from "@/lib/debts";
import type { RecurringRule } from "@/lib/recurring";
import type { Transaction } from "@/lib/transactions";
import { categoryCut, extraDebtPayment, incomeChange, recentMonths, recurringChange, saveEachMonth } from "@/lib/whatif";

const today = "2026-10-14";
const t = (date: string, amountMinor: number, over: Partial<Transaction> = {}): Transaction => ({
  id: `${date}-${amountMinor}-${over.type ?? "e"}`,
  type: "expense",
  amount: { amountMinor, currency: "AED" },
  category: "Food",
  categoryId: "food",
  date,
  ...over,
});

describe("recentMonths", () => {
  it("is the 3 full months before this one", () => {
    expect(recentMonths(today)).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(recentMonths("2027-01-05")).toEqual(["2026-10", "2026-11", "2026-12"]);
  });
});

describe("saveEachMonth", () => {
  it("adds up, and says how many months a goal takes", () => {
    expect(saveEachMonth(50000, 12, 800000)).toEqual({ totalMinor: 600000, monthsToGoal: 16 });
    expect(saveEachMonth(50000, 12, null)).toEqual({ totalMinor: 600000, monthsToGoal: null });
  });
});

describe("recurringChange", () => {
  const rent = { amount: { amountMinor: 500000, currency: "AED" }, frequency: "monthly" } as RecurringRule;

  it("gives the change a month and a year", () => {
    expect(recurringChange(rent, 550000)).toEqual({ perMonthMinor: 50000, perYearMinor: 600000 });
    expect(recurringChange({ ...rent, frequency: "weekly" }, 510000)).toEqual({ perMonthMinor: 43333, perYearMinor: 520000 });
    expect(recurringChange(rent, 450000).perMonthMinor).toBe(-50000);
  });
});

describe("categoryCut", () => {
  it("bases the saving on the category's average over the recent months", () => {
    const list = [
      t("2026-07-10", 60000),
      t("2026-08-10", 30000),
      t("2026-09-10", 30000),
      t("2026-10-10", 999999), // this month: not over yet, left out
      t("2026-06-10", 999999), // too old
      t("2026-09-11", 5000, { categoryId: "transport" }),
      t("2026-09-12", 7000, { amount: { amountMinor: 7000, currency: "EUR" } }),
    ];
    expect(categoryCut(list, "food", 20, today, "AED")).toEqual({ averageMinor: 40000, perMonthMinor: 8000, perYearMinor: 96000 });
  });

  it("is null with nothing to base it on", () => {
    expect(categoryCut([t("2026-10-10", 5000)], "food", 20, today, "AED")).toBeNull();
  });
});

describe("incomeChange", () => {
  it("compares what's left over each month on average, before and after", () => {
    const list = [
      t("2026-07-01", 600000, { type: "income" }),
      t("2026-08-01", 600000, { type: "income" }),
      t("2026-09-01", 600000, { type: "income" }),
      t("2026-07-05", 450000),
      t("2026-08-05", 450000),
      t("2026-09-05", 450000),
    ];
    expect(incomeChange(list, -100000, today, "AED")).toEqual({
      incomeMinor: 600000,
      spendingMinor: 450000,
      beforeMinor: 150000,
      afterMinor: 50000,
      perYearMinor: -1200000,
    });
  });

  it("is null with no history", () => {
    expect(incomeChange([], 100000, today, "AED")).toBeNull();
  });
});

describe("extraDebtPayment", () => {
  const loan = {
    id: "car",
    currency: "AED",
    paymentMinor: 100000,
    frequency: "monthly",
    nextDue: "2026-11-01",
    annualRate: "12",
  } as Debt;

  it("shows the payoff now and with the extra, and what it saves", () => {
    const got = extraDebtPayment(loan, 1000000, 50000);
    expect(got.now).toMatchObject({ payments: 11, interestMinor: 58985 });
    // 1,500 a month at 1%: −ln(1 − 0.01 × 10,000 ÷ 1,500) ÷ ln 1.01 = 6.93, so 7.
    expect(got.withExtra).toMatchObject({ kind: "paid-off", payments: 7 });
    expect(got.saved?.payments).toBe(4);
    expect(got.saved?.interestMinor).toBeGreaterThan(0);
  });

  it("saves payments but can't say about interest without a rate", () => {
    const got = extraDebtPayment({ ...loan, annualRate: null }, 1000000, 100000);
    expect(got.saved).toEqual({ payments: 5, interestMinor: null });
  });

  it("can turn a debt that never ends into one that does", () => {
    const got = extraDebtPayment({ ...loan, paymentMinor: 10000 }, 1000000, 100000);
    expect(got.now).toEqual({ kind: "never" });
    expect(got.withExtra.kind).toBe("paid-off");
    expect(got.saved).toBeNull();
  });
});
