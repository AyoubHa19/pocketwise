import { addMonths, monthOf } from "@/lib/dates";
import type { Money } from "@/lib/money";

// Savings goals (PRD 13, 10.9): something to save toward ("Emergency
// fund", "Trip to Spain"), with a target amount and, optionally, a date.
//
// What a goal has saved comes from one of two places, chosen per goal:
// - Its own entries ("contributions"): amounts the user notes as put aside
//   (or taken back out), each with a date. They're a record, not money
//   moving, so they never appear as income or spending: nothing is counted
//   twice.
// - An account's balance: the goal follows one of the user's accounts
//   (a savings account, say), and money is put aside with a transfer into
//   it, which, as always, isn't income or spending either.

export type Goal = {
  id: string;
  name: string;
  /** The amount to reach: always more than zero. Its currency never changes. */
  target: Money;
  /** "YYYY-MM-DD" to reach it by, or null for no date. */
  targetDate: string | null;
  /** The account it follows, or null when it counts its own entries. */
  accountId: string | null;
  /** Put away: hidden from the list and the dashboard, nothing deleted. */
  archived: boolean;
};

/** One entry in a goal's own record: money put aside, or (below zero) taken out. */
export type Contribution = {
  id: string;
  goalId: string;
  /** In the goal's currency; never zero. */
  amountMinor: number;
  date: string;
  note?: string;
};

export const MAX_GOAL_NAME_LENGTH = 40;
export const MAX_CONTRIBUTION_NOTE_LENGTH = 60;

/** What the goal's own entries add up to. */
export function savedFromContributions(goalId: string, contributions: Contribution[]): number {
  return contributions
    .filter((c) => c.goalId === goalId)
    .reduce((sum, c) => sum + c.amountMinor, 0);
}

export type GoalProgress = {
  savedMinor: number;
  /** target − saved, never below zero: once reached, nothing is left. */
  remainingMinor: number;
  /** saved / target × 100, rounded down, 0 to 100 (more is still 100). */
  percent: number;
  reached: boolean;
};

/**
 * How far the goal is, from what it has saved. Null when that isn't known
 * (it follows an account with no starting balance), so no made-up number
 * is ever shown.
 */
export function goalProgress(goal: Goal, savedMinor: number | null): GoalProgress | null {
  const targetMinor = goal.target.amountMinor;
  if (savedMinor === null || !(targetMinor > 0)) return null;
  const saved = Math.max(savedMinor, 0);
  return {
    savedMinor,
    remainingMinor: Math.max(targetMinor - saved, 0),
    percent: Math.min(Math.floor((saved * 100) / targetMinor), 100),
    reached: saved >= targetMinor,
  };
}

/**
 * How many monthly amounts are still possible before `targetDate`, this
 * month included: 1 when the date is this month, 2 next month, and so on.
 * Null when the date has passed.
 */
export function monthsLeft(today: string, targetDate: string): number | null {
  if (targetDate < today) return null;
  let months = 1;
  for (let month = monthOf(today); month < monthOf(targetDate); month = addMonths(month, 1)) months++;
  return months;
}

/** What to say about putting money aside each month. */
export type MonthlyPlan =
  | { kind: "reached" }
  | { kind: "no-date" }
  | { kind: "passed" }
  | { kind: "unknown" }
  | { kind: "monthly"; amountMinor: number; months: number };

/**
 * The suggested monthly amount: what's left, spread evenly over the months
 * until the target date (PRD 13), rounded up to a whole minor unit so the
 * goal is really reached. Without a date, or once it has passed, there's
 * no honest monthly figure, so the plan says which instead.
 */
export function monthlyPlan(goal: Goal, progress: GoalProgress | null, today: string): MonthlyPlan {
  if (progress === null) return { kind: "unknown" };
  if (progress.reached) return { kind: "reached" };
  if (goal.targetDate === null) return { kind: "no-date" };
  const months = monthsLeft(today, goal.targetDate);
  if (months === null) return { kind: "passed" };
  return { kind: "monthly", amountMinor: Math.ceil(progress.remainingMinor / months), months };
}

/** "YYYY-MM-DD" that is a real calendar day. */
function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return utc.getUTCFullYear() === y && utc.getUTCMonth() === m - 1 && utc.getUTCDate() === d;
}

/**
 * What's wrong with these goal values, or null if nothing is: a name of
 * some length, a target above zero in whole minor units, and a real date
 * if there is one. Used by the form and, again, by the server.
 */
export function goalProblem(values: Pick<Goal, "name" | "target" | "targetDate">): string | null {
  const name = values.name.trim();
  if (name.length === 0) return "Give the goal a name.";
  if (name.length > MAX_GOAL_NAME_LENGTH) return `A goal name can be up to ${MAX_GOAL_NAME_LENGTH} characters.`;
  if (!Number.isSafeInteger(values.target.amountMinor) || values.target.amountMinor <= 0) {
    return "Enter a target greater than zero.";
  }
  if (values.targetDate !== null && !isDate(values.targetDate)) return "Pick a real target date.";
  return null;
}

/**
 * What's wrong with an entry of `amountMinor` (below zero to take money
 * out), when the goal's entries already add up to `savedMinor`, or null.
 * Taking out more than was put in isn't possible.
 */
export function contributionProblem(
  amountMinor: number,
  savedMinor: number,
  date: string,
  note?: string,
): string | null {
  if (!Number.isSafeInteger(amountMinor) || amountMinor === 0) return "Enter an amount greater than zero.";
  if (amountMinor < 0 && -amountMinor > savedMinor) return "That's more than this goal has saved.";
  if (!isDate(date)) return "Pick a real date.";
  if (note !== undefined && note.length > MAX_CONTRIBUTION_NOTE_LENGTH) {
    return `A note can be up to ${MAX_CONTRIBUTION_NOTE_LENGTH} characters.`;
  }
  return null;
}
