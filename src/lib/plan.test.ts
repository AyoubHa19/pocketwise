import { describe, expect, it } from "vitest";
import type { Account } from "@/lib/accounts";
import { daysBetween, DEFAULT_PLAN, payPeriod, planProblem, safeToSpend, spentThisPeriod, type PlanSettings } from "@/lib/plan";
import { draftFor, type RecurringRule } from "@/lib/recurring";
import type { Transaction } from "@/lib/transactions";

const today = "2026-10-14";
const rule = (over: Partial<RecurringRule>): RecurringRule => ({
  id: "r",
  name: "R",
  type: "expense",
  amount: { amountMinor: 10000, currency: "AED" },
  categoryId: "c",
  accountId: null,
  frequency: "monthly",
  startDate: "2026-10-01",
  endDate: null,
  trackFrom: "2026-10-01",
  paused: false,
  remindDays: 3,
  skipped: [],
  ...over,
});
const salary = rule({ id: "salary", name: "Salary", type: "income", amount: { amountMinor: 500000, currency: "AED" }, startDate: "2026-09-25", trackFrom: "2026-09-25", frequency: "monthly" });
const rent = rule({ id: "rent", name: "Rent", amount: { amountMinor: 200000, currency: "AED" }, startDate: "2026-10-20", trackFrom: today });
const internet = rule({ id: "net", name: "Internet", amount: { amountMinor: 30000, currency: "AED" }, startDate: "2026-10-16", trackFrom: today });
const late = rule({ id: "late", name: "Gym", amount: { amountMinor: 15000, currency: "AED" }, startDate: "2026-10-05", trackFrom: "2026-10-01" });
const euroBill = rule({ id: "eur", name: "Spotify", amount: { amountMinor: 999, currency: "EUR" }, startDate: "2026-10-18", trackFrom: today });
const afterPayday = rule({ id: "after", name: "Later bill", startDate: "2026-10-26", trackFrom: today });

const accounts: Account[] = [
  { id: "bank", name: "Bank", type: "bank", currency: "AED", opening: { amountMinor: 600000, date: "2026-10-01" }, archived: false },
  { id: "cash", name: "Cash", type: "cash", currency: "AED", opening: { amountMinor: 20000, date: "2026-10-01" }, archived: false },
  { id: "new", name: "New card", type: "bank", currency: "AED", opening: null, archived: false },
  { id: "euro", name: "Euro", type: "wallet", currency: "EUR", opening: { amountMinor: 5000, date: "2026-10-01" }, archived: false },
  { id: "old", name: "Old", type: "bank", currency: "AED", opening: { amountMinor: 99999, date: "2026-10-01" }, archived: true },
];
const spend = (date: string, amountMinor: number, over: Partial<Transaction> = {}): Transaction => ({
  id: `${date}-${amountMinor}`,
  type: "expense",
  amount: { amountMinor, currency: "AED" },
  category: "Food",
  date,
  accountId: "bank",
  ...over,
});
const transactions = [spend("2026-10-02", 40000), spend("2026-10-10", 10000)];
const plan = (over: Partial<PlanSettings> = {}): PlanSettings => ({ ...DEFAULT_PLAN, salaryRuleId: "salary", ...over });

describe("daysBetween", () => {
  it("counts whole days, across months", () => {
    expect(daysBetween("2026-10-14", "2026-10-25")).toBe(11);
    expect(daysBetween("2026-10-31", "2026-11-01")).toBe(1);
    expect(daysBetween("2026-10-14", "2026-10-14")).toBe(0);
  });
});

describe("payPeriod", () => {
  it("runs from the last payday to the next one of the salary", () => {
    expect(payPeriod(plan(), [salary], [], today)).toMatchObject({ start: "2026-09-25", end: "2026-10-25", daysLeft: 11, source: "salary" });
  });

  it("moves on once the salary is recorded, and works weekly too", () => {
    const paidToday = { ...salary, startDate: "2026-09-14", trackFrom: "2026-09-14" };
    expect(payPeriod(plan(), [paidToday], [draftFor(paidToday, today, "Salary")], today)).toMatchObject({
      start: "2026-10-14",
      end: "2026-11-14",
    });
    const weekly = { ...salary, frequency: "weekly" as const, startDate: "2026-10-02" };
    expect(payPeriod(plan(), [weekly], [], today)).toMatchObject({ start: "2026-10-09", end: "2026-10-16", daysLeft: 2 });
  });

  it("uses a chosen date, from the last income recorded", () => {
    const got = payPeriod(plan({ salaryRuleId: null, payday: "2026-10-30" }), [], [spend("2026-10-03", 300000, { type: "income" })], today);
    expect(got).toMatchObject({ start: "2026-10-03", end: "2026-10-30", daysLeft: 16, source: "date" });
    expect(payPeriod(plan({ salaryRuleId: null, payday: "2026-10-30" }), [], [], today)?.start).toBe("2026-10-01");
  });

  it("is null without a payday, or with one in the past", () => {
    expect(payPeriod(DEFAULT_PLAN, [salary], [], today)).toBeNull();
    expect(payPeriod(plan({ salaryRuleId: null, payday: "2026-10-01" }), [], [], today)).toBeNull();
    expect(payPeriod(plan(), [{ ...salary, paused: true }], [], today)).toBeNull();
  });
});

describe("safeToSpend", () => {
  const data = { accounts, transactions, rules: [salary, rent, internet, late, euroBill, afterPayday], mainCurrency: "AED", today };

  it("is the balance minus unrecorded bills before payday, savings and reserve", () => {
    const got = safeToSpend(plan({ savingsMinor: 50000, reserveMinor: 100000 }), data)!;
    // Bank 6,000 − 400 − 100 = 5,500; Cash 200. New card has no balance; Euro and Old aren't counted.
    expect(got.balanceMinor).toBe(570000);
    expect(got.accounts.map((a) => a.account.id)).toEqual(["bank", "cash"]);
    expect(got.leftOut).toEqual([{ account: accounts[2], reason: "no-balance" }]);
    // Overdue gym 150, internet 300, rent 2,000; not the bill after payday.
    expect(got.bills.map((o) => o.rule.name)).toEqual(["Gym", "Internet", "Rent"]);
    expect(got.billsMinor).toBe(245000);
    expect(got.otherCurrencyBills.map((o) => o.rule.name)).toEqual(["Spotify"]);
    // 5,700 − 2,450 − 500 − 1,000 = 1,750, over 11 days.
    expect(got.resultMinor).toBe(175000);
    expect(got.perDayMinor).toBe(15909);
  });

  it("never counts expected income, and lists it", () => {
    const got = safeToSpend(plan(), data)!;
    expect(got.expectedIncome.map((o) => `${o.rule.name} ${o.date}`)).toEqual(["Salary 2026-10-25"]);
    expect(got.resultMinor).toBe(570000 - 245000);
  });

  it("subtracts a bill once: recorded ones are already in the balance, skipped ones not at all", () => {
    const recorded = [...transactions, { ...draftFor(internet, "2026-10-16", "Bills"), accountId: "bank" }];
    const got = safeToSpend(plan(), { ...data, transactions: recorded, rules: [salary, internet, { ...rent, skipped: ["2026-10-20"] }] })!;
    expect(got.bills).toEqual([]);
    // Recorded for the 16th: not in today's balance, subtracted once as "later".
    expect(got.balanceMinor).toBe(570000);
    expect(got.later.map((t) => t.date)).toEqual(["2026-10-16"]);
    expect(got.laterMinor).toBe(30000);
    expect(got.resultMinor).toBe(570000 - 30000);
  });

  it("can be short, with nothing per day", () => {
    const got = safeToSpend(plan({ reserveMinor: 1_000_000 }), data)!;
    expect(got.resultMinor).toBeLessThan(0);
    expect(got.perDayMinor).toBe(0);
  });

  it("counts only the accounts chosen, and names one in another currency", () => {
    const got = safeToSpend(plan({ accountIds: ["cash", "euro"] }), data)!;
    expect(got.balanceMinor).toBe(20000);
    expect(got.leftOut).toEqual([{ account: accounts[3], reason: "other-currency" }]);
  });

  it("is null without a pay period", () => {
    expect(safeToSpend(DEFAULT_PLAN, data)).toBeNull();
  });
});

describe("spentThisPeriod", () => {
  it("adds the main currency's spending since the period started", () => {
    const period = payPeriod(plan(), [salary], [], today)!;
    const list = [spend("2026-09-24", 99999), spend("2026-09-25", 5000), spend(today, 1000), spend(today, 700, { amount: { amountMinor: 700, currency: "EUR" } }), spend(today, 300, { type: "transfer", toAccountId: "cash" })];
    // 25 Sep to 14 Oct is 20 days.
    expect(spentThisPeriod(list, period, "AED", today)).toEqual({ spentMinor: 6000, days: 20, perDayMinor: 300 });
  });
});

describe("planProblem", () => {
  it("accepts good settings and refuses bad ones", () => {
    expect(planProblem(plan({ reserveMinor: 0, payday: "2026-10-30" }))).toBeNull();
    expect(planProblem(plan({ reserveMinor: -1 }))).toMatch("The reserve must be zero or more");
    expect(planProblem(plan({ savingsMinor: 1.5 }))).toMatch("Planned savings must be zero or more");
    expect(planProblem(plan({ payday: "2026-02-30" }))).toMatch("real payday");
  });
});
