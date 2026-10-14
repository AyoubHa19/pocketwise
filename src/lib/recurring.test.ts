import { describe, expect, it } from "vitest";
import {
  draftFor,
  needsAttention,
  nextDue,
  nthOccurrence,
  occurrenceId,
  occurrences,
  occurrencesBetween,
  ruleProblem,
  type RecurringRule,
} from "@/lib/recurring";
import type { Transaction } from "@/lib/transactions";

const rent: RecurringRule = {
  id: "rent",
  name: "Rent",
  type: "expense",
  amount: { amountMinor: 500000, currency: "MAD" },
  categoryId: "housing",
  accountId: "bank",
  frequency: "monthly",
  startDate: "2026-01-31",
  endDate: null,
  trackFrom: "2026-10-01",
  paused: false,
  remindDays: 3,
  skipped: [],
};

const paid = (rule: RecurringRule, date: string): Transaction => draftFor(rule, date, "Housing");

describe("nthOccurrence", () => {
  it("keeps a monthly day, moved to a shorter month's last day without drifting", () => {
    expect([0, 1, 2, 3, 12, 13].map((n) => nthOccurrence(rent, n))).toEqual([
      "2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30", "2027-01-31", "2027-02-28",
    ]);
    expect(nthOccurrence({ ...rent, startDate: "2028-01-31" }, 1)).toBe("2028-02-29");
  });

  it("steps weeks, two weeks, quarters and years", () => {
    expect(nthOccurrence({ frequency: "weekly", startDate: "2026-12-28" }, 1)).toBe("2027-01-04");
    expect(nthOccurrence({ frequency: "biweekly", startDate: "2026-10-14" }, 2)).toBe("2026-11-11");
    expect(nthOccurrence({ frequency: "quarterly", startDate: "2026-11-30" }, 1)).toBe("2027-02-28");
    expect(nthOccurrence({ frequency: "yearly", startDate: "2028-02-29" }, 1)).toBe("2029-02-28");
  });
});

describe("occurrencesBetween", () => {
  it("lists the dates in the range, both ends included, and stops at the end date", () => {
    expect(occurrencesBetween(rent, "2026-09-30", "2026-12-31")).toEqual(["2026-09-30", "2026-10-31", "2026-11-30", "2026-12-31"]);
    expect(occurrencesBetween({ ...rent, endDate: "2026-11-30" }, "2026-10-01", "2027-12-31")).toEqual(["2026-10-31", "2026-11-30"]);
  });

  it("has nothing before the start", () => {
    expect(occurrencesBetween({ ...rent, startDate: "2027-01-15" }, "2026-01-01", "2026-12-31")).toEqual([]);
  });
});

describe("occurrences", () => {
  const monthly = { ...rent, startDate: "2026-10-01", trackFrom: "2026-10-01" };

  it("says which are paid, skipped, overdue, due today, soon or later", () => {
    const states = (today: string, transactions: Transaction[] = [], skipped: string[] = []) =>
      occurrences({ ...monthly, skipped }, transactions, today, "2027-01-31").map((o) => `${o.date} ${o.state}`);
    expect(states("2026-10-14")).toEqual([
      "2026-10-01 overdue", "2026-11-01 later", "2026-12-01 later", "2027-01-01 later",
    ]);
    expect(states("2026-10-29", [paid(monthly, "2026-10-01")])).toEqual([
      "2026-10-01 paid", "2026-11-01 soon", "2026-12-01 later", "2027-01-01 later",
    ]);
    expect(states("2026-11-01", [], ["2026-10-01"]).slice(0, 2)).toEqual(["2026-10-01 skipped", "2026-11-01 today"]);
  });

  it("lists nothing before trackFrom, and nothing while paused", () => {
    expect(occurrences({ ...rent, trackFrom: "2026-10-14" }, [], "2026-10-14", "2026-11-30").map((o) => o.date)).toEqual([
      "2026-10-31", "2026-11-30",
    ]);
    expect(occurrences({ ...rent, paused: true }, [], "2026-10-14", "2027-12-31")).toEqual([]);
  });
});

describe("nextDue", () => {
  it("is the first one still to record, overdue first", () => {
    const monthly = { ...rent, startDate: "2026-10-01", trackFrom: "2026-10-01" };
    expect(nextDue(monthly, [], "2026-10-14")?.date).toBe("2026-10-01");
    expect(nextDue(monthly, [paid(monthly, "2026-10-01")], "2026-10-14")?.date).toBe("2026-11-01");
    expect(nextDue({ ...monthly, skipped: ["2026-10-01"] }, [], "2026-10-14")?.date).toBe("2026-11-01");
  });

  it("is null once the rule has ended", () => {
    expect(nextDue({ ...rent, endDate: "2026-09-30" }, [], "2026-10-14")).toBeNull();
  });
});

describe("needsAttention", () => {
  it("gathers what's overdue, due today or within its reminder, soonest first", () => {
    const phone: RecurringRule = { ...rent, id: "phone", name: "Phone", startDate: "2026-10-16", trackFrom: "2026-10-14", remindDays: 3 };
    const gym: RecurringRule = { ...rent, id: "gym", name: "Gym", startDate: "2026-10-20", trackFrom: "2026-10-14", remindDays: 3 };
    const late: RecurringRule = { ...rent, id: "late", name: "Late", startDate: "2026-10-05", trackFrom: "2026-10-01" };
    const due = needsAttention([phone, gym, late], [], "2026-10-14").map((o) => `${o.rule.name} ${o.date} ${o.state}`);
    expect(due).toEqual(["Late 2026-10-05 overdue", "Phone 2026-10-16 soon"]);
  });
});

describe("recording an occurrence", () => {
  it("fills in a transaction whose id is the occurrence's, so it can't be added twice", () => {
    expect(draftFor(rent, "2026-10-31", "Housing")).toEqual({
      id: occurrenceId("rent", "2026-10-31"),
      type: "expense",
      amount: { amountMinor: 500000, currency: "MAD" },
      category: "Housing",
      categoryId: "housing",
      date: "2026-10-31",
      description: "Rent",
      accountId: "bank",
    });
    expect(draftFor({ ...rent, accountId: null }, "2026-10-31", "Housing").accountId).toBeUndefined();
  });
});

describe("ruleProblem", () => {
  it("accepts a good rule", () => {
    expect(ruleProblem(rent)).toBeNull();
  });

  it("refuses a missing name, a bad amount, dates or reminder", () => {
    expect(ruleProblem({ ...rent, name: " " })).toMatch("Give it a name");
    expect(ruleProblem({ ...rent, amount: { amountMinor: 0, currency: "MAD" } })).toMatch("greater than zero");
    expect(ruleProblem({ ...rent, startDate: "2026-02-30" })).toMatch("first date");
    expect(ruleProblem({ ...rent, endDate: "2025-12-31" })).toMatch("before the first date");
    expect(ruleProblem({ ...rent, remindDays: 31 })).toMatch("0 to 30 days");
    expect(ruleProblem({ ...rent, remindDays: 1.5 })).toMatch("0 to 30 days");
  });
});
