import { describe, expect, it } from "vitest";
import {
  contributionProblem,
  goalProblem,
  goalProgress,
  monthlyPlan,
  monthsLeft,
  savedFromContributions,
  type Contribution,
  type Goal,
} from "@/lib/goals";

const goal: Goal = {
  id: "trip",
  name: "Trip",
  target: { amountMinor: 1000000, currency: "MAD" },
  targetDate: "2027-06-30",
  accountId: null,
  archived: false,
};

const entry = (id: string, goalId: string, amountMinor: number): Contribution => ({
  id,
  goalId,
  amountMinor,
  date: "2026-10-01",
});

describe("savedFromContributions", () => {
  it("adds up the goal's own entries, money taken out included", () => {
    const entries = [entry("a", "trip", 300000), entry("b", "trip", -50000), entry("c", "car", 999999)];
    expect(savedFromContributions("trip", entries)).toBe(250000);
    expect(savedFromContributions("none", entries)).toBe(0);
  });
});

describe("goalProgress", () => {
  it("gives the share saved and what's left", () => {
    expect(goalProgress(goal, 250000)).toEqual({ savedMinor: 250000, remainingMinor: 750000, percent: 25, reached: false });
  });

  it("stops at 100% and nothing left once reached", () => {
    expect(goalProgress(goal, 1000000)).toMatchObject({ remainingMinor: 0, percent: 100, reached: true });
    expect(goalProgress(goal, 1200000)).toMatchObject({ savedMinor: 1200000, remainingMinor: 0, percent: 100, reached: true });
  });

  it("rounds down, so 99.99% isn't shown as done", () => {
    expect(goalProgress(goal, 999999)).toMatchObject({ percent: 99, reached: false });
  });

  it("treats an account below zero as nothing saved", () => {
    expect(goalProgress(goal, -5000)).toMatchObject({ savedMinor: -5000, remainingMinor: 1000000, percent: 0 });
  });

  it("is unknown when what's saved isn't known, or the target is bad", () => {
    expect(goalProgress(goal, null)).toBeNull();
    expect(goalProgress({ ...goal, target: { amountMinor: 0, currency: "MAD" } }, 100)).toBeNull();
  });
});

describe("monthsLeft", () => {
  it("counts this month and every month up to the date's", () => {
    expect(monthsLeft("2026-10-14", "2026-10-31")).toBe(1);
    expect(monthsLeft("2026-10-14", "2026-10-14")).toBe(1);
    expect(monthsLeft("2026-10-14", "2026-11-01")).toBe(2);
    expect(monthsLeft("2026-10-14", "2027-06-30")).toBe(9);
  });

  it("is null once the date has passed", () => {
    expect(monthsLeft("2026-10-14", "2026-10-13")).toBeNull();
  });
});

describe("monthlyPlan", () => {
  const plan = (saved: number | null, over: Partial<Goal> = {}, today = "2026-10-14") =>
    monthlyPlan({ ...goal, ...over }, goalProgress({ ...goal, ...over }, saved), today);

  it("spreads what's left over the months to the date, rounded up", () => {
    // 7,500 MAD over 9 months is 833.333..., so 833.34 a month.
    expect(plan(250000)).toEqual({ kind: "monthly", amountMinor: 83334, months: 9 });
    expect(plan(250000, { targetDate: "2026-10-31" })).toEqual({ kind: "monthly", amountMinor: 750000, months: 1 });
  });

  it("explains instead of guessing without a date, after it, once reached, or when unknown", () => {
    expect(plan(250000, { targetDate: null })).toEqual({ kind: "no-date" });
    expect(plan(250000, { targetDate: "2026-09-30" })).toEqual({ kind: "passed" });
    expect(plan(1000000, { targetDate: "2026-09-30" })).toEqual({ kind: "reached" });
    expect(plan(null)).toEqual({ kind: "unknown" });
  });
});

describe("goalProblem", () => {
  const values = (over: Partial<Goal> = {}) => ({ ...goal, ...over });

  it("accepts a good goal, with or without a date", () => {
    expect(goalProblem(values())).toBeNull();
    expect(goalProblem(values({ targetDate: null }))).toBeNull();
  });

  it("refuses a missing or long name, a bad target or a bad date", () => {
    expect(goalProblem(values({ name: "  " }))).toMatch("Give the goal a name");
    expect(goalProblem(values({ name: "x".repeat(41) }))).toMatch("up to 40");
    expect(goalProblem(values({ target: { amountMinor: 0, currency: "MAD" } }))).toMatch("greater than zero");
    expect(goalProblem(values({ target: { amountMinor: 10.5, currency: "MAD" } }))).toMatch("greater than zero");
    expect(goalProblem(values({ targetDate: "2027-02-30" }))).toMatch("real target date");
  });
});

describe("contributionProblem", () => {
  it("accepts money in, and out up to what's saved", () => {
    expect(contributionProblem(5000, 0, "2026-10-14")).toBeNull();
    expect(contributionProblem(-5000, 5000, "2026-10-14")).toBeNull();
  });

  it("refuses zero, more out than saved, a bad date or a long note", () => {
    expect(contributionProblem(0, 0, "2026-10-14")).toMatch("greater than zero");
    expect(contributionProblem(1.5, 0, "2026-10-14")).toMatch("greater than zero");
    expect(contributionProblem(-5001, 5000, "2026-10-14")).toMatch("more than this goal has saved");
    expect(contributionProblem(100, 0, "2026-13-01")).toMatch("real date");
    expect(contributionProblem(100, 0, "2026-10-14", "x".repeat(61))).toMatch("up to 60");
  });
});
