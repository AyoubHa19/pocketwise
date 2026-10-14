import { describe, expect, it } from "vitest";
import {
  debtPaymentId,
  debtPayments,
  debtProblem,
  debtStatus,
  parseRate,
  payoff,
  perMonthMinor,
  type Debt,
} from "@/lib/debts";
import type { Transaction } from "@/lib/transactions";

const loan: Debt = {
  id: "car",
  name: "Car loan",
  currency: "AED",
  balanceMinor: 1000000,
  balanceDate: "2026-10-01",
  paymentMinor: 100000,
  frequency: "monthly",
  nextDue: "2026-11-01",
  annualRate: "12",
  originalMinor: 2000000,
  ruleId: "rule-car",
  archived: false,
};

const pay = (id: string, date: string, amountMinor = 100000, over: Partial<Transaction> = {}): Transaction => ({
  id,
  type: "expense",
  amount: { amountMinor, currency: "AED" },
  category: "Debt Payments",
  date,
  ...over,
});

describe("debtPayments and debtStatus", () => {
  const list = [
    pay(debtPaymentId("car", "a"), "2026-10-01"),
    pay("recurring-rule-car-2026-10-05", "2026-10-05"),
    pay(debtPaymentId("car", "old"), "2026-09-30"),
    pay(debtPaymentId("car", "eur"), "2026-10-02", 5000, { amount: { amountMinor: 5000, currency: "EUR" } }),
    pay(debtPaymentId("other", "x"), "2026-10-03"),
    pay("recurring-rule-gym-2026-10-04", "2026-10-04"),
  ];

  it("finds payments recorded from the debt or through its recurring item, in its currency", () => {
    expect(debtPayments(loan, list).map((t) => t.id).sort()).toEqual(
      [debtPaymentId("car", "a"), debtPaymentId("car", "old"), "recurring-rule-car-2026-10-05"].sort(),
    );
  });

  it("takes payments on or after the balance's date off it, once", () => {
    expect(debtStatus(loan, list)).toMatchObject({ paidSinceMinor: 200000, remainingMinor: 800000, paidOff: false });
    expect(debtStatus(loan, list).payments.map((t) => t.date)).toEqual(["2026-10-01", "2026-10-05"]);
  });

  it("is paid off once the payments cover it, never below zero", () => {
    const big = [pay(debtPaymentId("car", "all"), "2026-10-02", 1500000)];
    expect(debtStatus(loan, big)).toMatchObject({ remainingMinor: 0, paidOff: true });
  });
});

describe("parseRate", () => {
  it("reads a percent from 0 to 100, or null", () => {
    expect(parseRate("12.5")).toBe(12.5);
    expect(parseRate("0")).toBe(0);
    expect(parseRate(null)).toBeNull();
    expect(parseRate("101")).toBeNull();
    expect(parseRate("12,5")).toBeNull();
    expect(parseRate("-1")).toBeNull();
  });
});

describe("payoff", () => {
  it("adds interest each period at the yearly rate ÷ payments a year, matching the loan formula", () => {
    // 10,000 at 12% a year (1% a month), 1,000 a month: the formula gives
    // 10.59 payments, so 11, the last one smaller.
    expect(payoff(loan, 1000000)).toEqual({
      kind: "paid-off",
      payments: 11,
      lastDate: "2027-09-01",
      interestMinor: 58985,
      totalMinor: 1058985,
    });
  });

  it("counts payments only, and says interest is unknown, without a rate", () => {
    expect(payoff({ ...loan, annualRate: null }, 1000000)).toEqual({
      kind: "paid-off",
      payments: 10,
      lastDate: "2027-08-01",
      interestMinor: null,
      totalMinor: null,
    });
  });

  it("says so when the installment doesn't cover the interest, or it'd take over 100 years", () => {
    expect(payoff({ ...loan, paymentMinor: 10000 }, 1000000)).toEqual({ kind: "never" });
    expect(payoff({ ...loan, annualRate: null, paymentMinor: 1 }, 1000000)).toEqual({ kind: "too-long" });
  });

  it("is nothing to do once paid, and has no last date without a next due date", () => {
    expect(payoff(loan, 0)).toMatchObject({ kind: "paid-off", payments: 0 });
    expect(payoff({ ...loan, nextDue: null }, 1000000)).toMatchObject({ lastDate: null });
  });

  it("works weekly too", () => {
    expect(payoff({ ...loan, frequency: "weekly", annualRate: null, nextDue: "2026-10-16" }, 300000)).toMatchObject({
      payments: 3,
      lastDate: "2026-10-30",
    });
  });
});

describe("perMonthMinor", () => {
  it("averages an installment over a year", () => {
    expect(perMonthMinor({ amountMinor: 1200, currency: "AED" }, "weekly")).toBe(5200);
    expect(perMonthMinor({ amountMinor: 1200, currency: "AED" }, "quarterly")).toBe(400);
  });
});

describe("debtProblem", () => {
  const values = (over: Partial<Debt> = {}) => {
    const d: Partial<Debt> = { ...loan, ...over };
    delete d.id;
    delete d.archived;
    return d as Omit<Debt, "id" | "archived">;
  };

  it("accepts a good debt, with or without a rate", () => {
    expect(debtProblem(values(), "2026-10-14")).toBeNull();
    expect(debtProblem(values({ annualRate: null, originalMinor: null, nextDue: null, ruleId: null }), "2026-10-14")).toBeNull();
  });

  it("refuses missing or bad values, a future balance date, and a bad rate", () => {
    expect(debtProblem(values({ name: " " }), "2026-10-14")).toMatch("Give the debt a name");
    expect(debtProblem(values({ balanceMinor: 0 }), "2026-10-14")).toMatch("still owed");
    expect(debtProblem(values({ paymentMinor: -1 }), "2026-10-14")).toMatch("installment");
    expect(debtProblem(values({ originalMinor: 0 }), "2026-10-14")).toMatch("borrowed");
    expect(debtProblem(values({ balanceDate: "2026-11-01" }), "2026-10-14")).toMatch("today or earlier");
    expect(debtProblem(values({ nextDue: "2026-02-30" }), "2026-10-14")).toMatch("next installment");
    expect(debtProblem(values({ annualRate: "150" }), "2026-10-14")).toMatch("0 to 100");
  });
});
