import { describe, expect, it } from "vitest";
import { calendarDays, monthGrid, weekday, weekdayNames } from "@/lib/calendar";
import type { Goal } from "@/lib/goals";
import { draftFor, type RecurringRule } from "@/lib/recurring";
import type { Transaction } from "@/lib/transactions";

describe("weekday", () => {
  it("gives Sunday 0 to Saturday 6", () => {
    expect(weekday("2026-10-04")).toBe(0);
    expect(weekday("2026-10-14")).toBe(3);
    expect(weekday("2026-10-17")).toBe(6);
  });
});

describe("weekdayNames", () => {
  it("starts on the chosen day", () => {
    expect(weekdayNames("monday")).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(weekdayNames("sunday")[0]).toBe("Sun");
    expect(weekdayNames("saturday")).toEqual(["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"]);
    expect(weekdayNames("monday", "long")[0]).toBe("Monday");
  });
});

describe("monthGrid", () => {
  it("lays out whole weeks from the chosen day, with the neighbouring months' days", () => {
    // October 2026 starts on a Thursday and ends on a Saturday.
    const monday = monthGrid("2026-10", "monday");
    expect(monday).toHaveLength(5);
    expect(monday[0]).toEqual(["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
    expect(monday[4][6]).toBe("2026-11-01");

    const sunday = monthGrid("2026-10", "sunday");
    expect(sunday[0][0]).toBe("2026-09-27");
    expect(sunday[sunday.length - 1][6]).toBe("2026-10-31");

    const saturday = monthGrid("2026-10", "saturday");
    expect(saturday[0][0]).toBe("2026-09-26");
    expect(saturday[saturday.length - 1]).toContain("2026-10-31");
  });

  it("has every day of the month exactly once, in order", () => {
    for (const start of ["monday", "sunday", "saturday"] as const) {
      const days = monthGrid("2027-02", start).flat();
      expect(days.filter((d) => d.startsWith("2027-02"))).toHaveLength(28);
      expect([...days].sort()).toEqual(days);
    }
  });
});

describe("calendarDays", () => {
  const t = (id: string, over: Partial<Transaction>): Transaction => ({
    id,
    type: "expense",
    amount: { amountMinor: 1000, currency: "AED" },
    category: "Food",
    date: "2026-10-14",
    ...over,
  });
  const rent: RecurringRule = {
    id: "rent",
    name: "Rent",
    type: "expense",
    amount: { amountMinor: 500000, currency: "AED" },
    categoryId: "housing",
    accountId: null,
    frequency: "monthly",
    startDate: "2026-10-14",
    endDate: null,
    trackFrom: "2026-10-14",
    paused: false,
    remindDays: 3,
    skipped: [],
  };
  const trip: Goal = {
    id: "trip",
    name: "Trip",
    target: { amountMinor: 100000, currency: "AED" },
    targetDate: "2026-10-30",
    accountId: null,
    archived: false,
  };

  const transactions = [
    t("lunch", {}),
    t("salary", { type: "income", amount: { amountMinor: 500000, currency: "AED" } }),
    t("atm", { type: "transfer", category: "Transfer", accountId: "a", toAccountId: "b" }),
    t("paris", { amount: { amountMinor: 900, currency: "EUR" } }),
    t("rent-paid", { ...draftFor(rent, "2026-10-14", "Housing") }),
    t("outside", { date: "2026-12-01" }),
  ];
  const days = calendarDays("2026-09-28", "2026-11-30", {
    transactions,
    rules: [rent],
    goals: [trip, { ...trip, id: "old", archived: true }],
    mainCurrency: "AED",
    today: "2026-10-14",
  });

  it("has a day for every date in the range", () => {
    expect(days.size).toBe(64);
    expect(days.get("2026-12-01")).toBeUndefined();
  });

  it("adds up the day's income and spending in the main currency, without transfers", () => {
    const day = days.get("2026-10-14")!;
    expect(day.transactions).toHaveLength(5);
    expect(day.incomeMinor).toBe(500000);
    expect(day.spendingMinor).toBe(1000 + 500000);
    expect(day.otherCurrencies).toBe(true);
  });

  it("keeps expected items apart, and never lists one already recorded", () => {
    expect(days.get("2026-10-14")!.expected).toEqual([]);
    expect(days.get("2026-11-14")!.expected.map((o) => o.rule.name)).toEqual(["Rent"]);
  });

  it("shows open goals on their date", () => {
    expect(days.get("2026-10-30")!.goals.map((g) => g.id)).toEqual(["trip"]);
  });
});
