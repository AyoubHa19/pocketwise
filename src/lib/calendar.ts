import { addDays, addMonths } from "@/lib/dates";
import type { Goal } from "@/lib/goals";
import type { WeekStart } from "@/lib/preferences";
import { occurrences, type Occurrence, type RecurringRule } from "@/lib/recurring";
import { signedAmount, type Transaction } from "@/lib/transactions";

// The financial calendar (PRD 19): a month laid out in weeks, with what
// happened each day (transactions) kept apart from what's expected
// (recurring items not yet recorded, goal dates).

/** JavaScript's day numbers: Sunday 0 to Saturday 6. */
const FIRST_DAY: Record<WeekStart, number> = { sunday: 0, monday: 1, saturday: 6 };

/** The day of the week of a "YYYY-MM-DD" date, Sunday 0 to Saturday 6. */
export function weekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** The weekday names in order for this week start: ["Mon", "Tue", ...]. */
export function weekdayNames(weekStart: WeekStart, style: "short" | "long" = "short"): string[] {
  // 2026-10-04 is a Sunday; the days after it are Monday onwards.
  const format = new Intl.DateTimeFormat("en-GB", { weekday: style, timeZone: "UTC" });
  return Array.from({ length: 7 }, (_, i) => {
    const [y, m, d] = addDays("2026-10-04", FIRST_DAY[weekStart] + i).split("-").map(Number);
    return format.format(new Date(Date.UTC(y, m - 1, d)));
  });
}

/**
 * The weeks to draw for `month` ("YYYY-MM"): whole weeks from the one the
 * 1st falls in to the one the last day falls in, so a few days of the
 * months on either side fill the first and last rows.
 */
export function monthGrid(month: string, weekStart: WeekStart): string[][] {
  const first = `${month}-01`;
  const last = addDays(`${addMonths(month, 1)}-01`, -1);
  const lead = (weekday(first) - FIRST_DAY[weekStart] + 7) % 7;
  const weeks: string[][] = [];
  for (let start = addDays(first, -lead); start <= last; start = addDays(start, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)));
  }
  return weeks;
}

/** Everything on one calendar day. */
export type CalendarDay = {
  date: string;
  /** What happened: the day's transactions. */
  transactions: Transaction[];
  /** Income and spending in the main currency (transfers aren't either). */
  incomeMinor: number;
  spendingMinor: number;
  /** Whether some of the day's transactions are in another currency. */
  otherCurrencies: boolean;
  /** What's expected: recurring items due that day and not yet recorded or skipped. */
  expected: Occurrence[];
  /** Goals to be reached by that day. */
  goals: Goal[];
};

/**
 * The calendar's days from `from` to `to`, by date. Expected items are
 * computed up to `to` but never shown as done: a recorded one appears as
 * its transaction instead, and a skipped one not at all.
 */
export function calendarDays(
  from: string,
  to: string,
  data: {
    transactions: Transaction[];
    rules: RecurringRule[];
    goals: Goal[];
    mainCurrency: string;
    today: string;
  },
): Map<string, CalendarDay> {
  const days = new Map<string, CalendarDay>();
  for (let date = from; date <= to; date = addDays(date, 1)) {
    days.set(date, {
      date,
      transactions: [],
      incomeMinor: 0,
      spendingMinor: 0,
      otherCurrencies: false,
      expected: [],
      goals: [],
    });
  }
  for (const t of data.transactions) {
    const day = days.get(t.date);
    if (!day) continue;
    day.transactions.push(t);
    if (t.type === "transfer") continue;
    if (t.amount.currency !== data.mainCurrency) {
      day.otherCurrencies = true;
      continue;
    }
    const { amountMinor } = signedAmount(t);
    if (amountMinor > 0) day.incomeMinor += amountMinor;
    else day.spendingMinor += -amountMinor;
  }
  for (const rule of data.rules) {
    for (const o of occurrences(rule, data.transactions, data.today, to)) {
      if (o.state === "paid" || o.state === "skipped") continue;
      days.get(o.date)?.expected.push(o);
    }
  }
  for (const goal of data.goals) {
    if (goal.archived || goal.targetDate === null) continue;
    days.get(goal.targetDate)?.goals.push(goal);
  }
  return days;
}
