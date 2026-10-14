import { budgetLabel, budgetProgress, type Budget } from "@/lib/budgets";
import { addMonths, formatMonth, monthOf } from "@/lib/dates";
import { goalProgress, monthlyPlan, type Goal } from "@/lib/goals";
import { formatMoney } from "@/lib/money";
import { needsAttention, type RecurringRule } from "@/lib/recurring";
import { monthlyTotals, type MonthTotals } from "@/lib/summary";
import type { Transaction } from "@/lib/transactions";

// Reports and insights (PRD 21). Everything here is worked out from the
// user's own transactions, in one currency (amounts in others can't be
// added without an exchange rate), with the formulas of PRD 10. Nothing is
// estimated or filled in: a month without transactions is a month at zero,
// and an insight is only given when its numbers allow it. Each insight
// carries `how`, the calculation behind it in plain words.

/** The `length` months ending with `lastMonth`, oldest first. */
export function periodMonths(lastMonth: string, length: number): string[] {
  return Array.from({ length }, (_, i) => addMonths(lastMonth, i - length + 1));
}

export type PeriodTotals = {
  incomeMinor: number;
  spendingMinor: number;
  /** Income − spending (PRD 10.3): negative when more went out. */
  netMinor: number;
  /** Spending ÷ income × 100, rounded (PRD 10.6); null without income. */
  spentPercent: number | null;
};

/** The income, spending and net of the given months' rows, added up. */
export function periodTotals(rows: MonthTotals[]): PeriodTotals {
  const incomeMinor = rows.reduce((sum, r) => sum + r.incomeMinor, 0);
  const spendingMinor = rows.reduce((sum, r) => sum + r.spendingMinor, 0);
  return {
    incomeMinor,
    spendingMinor,
    netMinor: incomeMinor - spendingMinor,
    spentPercent: incomeMinor > 0 ? Math.round((spendingMinor / incomeMinor) * 100) : null,
  };
}

/**
 * How much `current` changed from `previous`, as a whole percentage, or
 * null when there's nothing to compare with (previous is zero): a change
 * from nothing has no meaningful percentage.
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

/** One report period and the one just before it, each `length` months long. */
export type Comparison = {
  months: string[];
  previousMonths: string[];
  rows: MonthTotals[];
  current: PeriodTotals;
  previous: PeriodTotals;
};

export function compare(
  transactions: Transaction[],
  lastMonth: string,
  length: number,
  currency: string,
): Comparison {
  const months = periodMonths(lastMonth, length);
  const previousMonths = periodMonths(addMonths(lastMonth, -length), length);
  const rows = monthlyTotals(transactions, lastMonth, length, currency);
  const previousRows = monthlyTotals(transactions, addMonths(lastMonth, -length), length, currency);
  return { months, previousMonths, rows, current: periodTotals(rows), previous: periodTotals(previousRows) };
}

export type CategoryRow = {
  category: string;
  currentMinor: number;
  previousMinor: number;
  /** Its share of the period's spending, rounded (PRD 10.7). */
  percent: number;
  /** Change from the previous period, or null when it had none there. */
  change: number | null;
};

/**
 * Spending per category in `months` beside the same category in
 * `previousMonths`, biggest first. Categories with spending in either
 * period are listed, so one that dropped to zero still shows.
 */
export function categoryComparison(
  transactions: Transaction[],
  months: string[],
  previousMonths: string[],
  currency: string,
): CategoryRow[] {
  const now = new Map<string, number>();
  const before = new Map<string, number>();
  const inNow = new Set(months);
  const inBefore = new Set(previousMonths);
  for (const t of transactions) {
    if (t.type !== "expense" || t.amount.currency !== currency) continue;
    const month = monthOf(t.date);
    const target = inNow.has(month) ? now : inBefore.has(month) ? before : null;
    if (target) target.set(t.category, (target.get(t.category) ?? 0) + t.amount.amountMinor);
  }
  const total = [...now.values()].reduce((sum, v) => sum + v, 0);
  return [...new Set([...now.keys(), ...before.keys()])]
    .map((category) => {
      const currentMinor = now.get(category) ?? 0;
      const previousMinor = before.get(category) ?? 0;
      return {
        category,
        currentMinor,
        previousMinor,
        percent: total > 0 ? Math.round((currentMinor / total) * 100) : 0,
        change: percentChange(currentMinor, previousMinor),
      };
    })
    .sort((a, b) => b.currentMinor - a.currentMinor || b.previousMinor - a.previousMinor || a.category.localeCompare(b.category));
}

/** How many times a frequency comes round in a year. */
const PER_YEAR = { weekly: 52, biweekly: 26, monthly: 12, quarterly: 4, yearly: 1 } as const;

/**
 * What the active recurring items in `currency` come to per month, on
 * average over a year (a weekly one counts 52 ÷ 12 times), rounded to the
 * minor unit: spending and income separately.
 */
export function recurringPerMonth(rules: RecurringRule[], currency: string, today: string) {
  let spendingMinor = 0;
  let incomeMinor = 0;
  for (const r of rules) {
    if (r.paused || r.amount.currency !== currency) continue;
    if (r.endDate !== null && r.endDate < today) continue;
    const monthly = (r.amount.amountMinor * PER_YEAR[r.frequency]) / 12;
    if (r.type === "expense") spendingMinor += monthly;
    else incomeMinor += monthly;
  }
  return { spendingMinor: Math.round(spendingMinor), incomeMinor: Math.round(incomeMinor) };
}

export type Insight = {
  id: string;
  /** How it reads: something to watch, something good, or just to know. */
  tone: "watch" | "good" | "info";
  text: string;
  /** The calculation behind it, so it can be checked (PRD 21). */
  how: string;
};

/** A category's spending must have moved by this share… */
const CATEGORY_CHANGE = 25;
/** …and by at least this share of the period's spending, to be worth saying. */
const CATEGORY_WEIGHT = 5;
/** Spending this far from the recent average is worth saying. */
const SPENDING_SWING = 30;

/**
 * Plain observations from the numbers, most useful first. Each only when
 * its data allows: no comparison without a previous period that had
 * spending, no average without months of history.
 */
export function insights(data: {
  transactions: Transaction[];
  comparison: Comparison;
  categories: CategoryRow[];
  budgets: Budget[];
  categoryNames: Map<string, string>;
  goals: Goal[];
  goalSaved: (goal: Goal) => number | null;
  rules: RecurringRule[];
  currency: string;
  today: string;
}): Insight[] {
  const { comparison, currency, today } = data;
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency });
  const lastMonth = comparison.months[comparison.months.length - 1];
  const out: Insight[] = [];

  // Recurring items to record now: overdue, due today, or within their reminder.
  const due = needsAttention(data.rules, data.transactions, today);
  if (due.length > 0) {
    const overdue = due.filter((o) => o.state === "overdue").length;
    const names = [...new Set(due.map((o) => o.rule.name))].join(", ");
    out.push({
      id: "recurring-due",
      tone: overdue > 0 ? "watch" : "info",
      text:
        overdue > 0
          ? `${overdue === 1 ? "A recurring item is" : `${overdue} recurring items are`} overdue: ${names}.`
          : `${due.length === 1 ? "A recurring item is" : `${due.length} recurring items are`} coming up: ${names}.`,
      how: "Items due today, within the days you chose to be reminded, or already past their date and not recorded. They're on the Bills page.",
    });
  }

  // Budgets over their limit in the last month of the period.
  for (const budget of data.budgets) {
    if (budget.limit.currency !== currency) continue;
    const p = budgetProgress(budget, data.transactions, lastMonth);
    if (p.state === "over") {
      out.push({
        id: `budget-${budget.id}`,
        tone: "watch",
        text: `${budgetLabel(budget, data.categoryNames)} went ${money(-p.remainingMinor)} over its budget in ${formatMonth(lastMonth)}.`,
        // No percentage: rounded down, 100.25% would read as 100%.
        how: `Spent ${money(p.spentMinor)} against a limit of ${money(budget.limit.amountMinor)}.`,
      });
    }
  }

  // Categories that moved a lot, and mattered, against the previous period.
  const spending = comparison.current.spendingMinor;
  if (comparison.previous.spendingMinor > 0 && spending > 0) {
    for (const row of data.categories) {
      if (row.change === null || Math.abs(row.change) < CATEGORY_CHANGE) continue;
      const moved = Math.abs(row.currentMinor - row.previousMinor);
      if (moved * 100 < spending * CATEGORY_WEIGHT) continue;
      const up = row.change > 0;
      out.push({
        id: `category-${row.category}`,
        tone: up ? "watch" : "good",
        text: `You spent ${Math.abs(row.change)}% ${up ? "more" : "less"} on ${row.category} than in the period before.`,
        how: `${money(row.currentMinor)} now against ${money(row.previousMinor)} before (${comparison.months.length === 1 ? "month" : `${comparison.months.length} months`} each).`,
      });
    }
  }

  // The last month's spending against the average of the three before it,
  // when all three had some (otherwise there's no fair average).
  const history = monthlyTotals(data.transactions, addMonths(lastMonth, -1), 3, currency);
  const last = monthlyTotals(data.transactions, lastMonth, 1, currency)[0];
  if (history.every((m) => m.spendingMinor > 0) && last.spendingMinor > 0) {
    const average = Math.round(history.reduce((s, m) => s + m.spendingMinor, 0) / 3);
    const swing = percentChange(last.spendingMinor, average)!;
    if (Math.abs(swing) >= SPENDING_SWING) {
      out.push({
        id: "spending-swing",
        tone: swing > 0 ? "watch" : "good",
        text: `Spending in ${formatMonth(lastMonth)} was ${Math.abs(swing)}% ${swing > 0 ? "above" : "below"} your average of the 3 months before.`,
        how: `${money(last.spendingMinor)} against an average of ${money(average)} (${history.map((m) => money(m.spendingMinor)).join(", ")}).`,
      });
    }
  }

  // Goals whose date has passed without reaching them, or that need more
  // each month than has been left over on average lately.
  const recent = monthlyTotals(data.transactions, monthOf(today), 3, currency);
  const leftOver = Math.round(recent.reduce((s, m) => s + m.incomeMinor - m.spendingMinor, 0) / 3);
  for (const goal of data.goals) {
    if (goal.archived || goal.target.currency !== currency) continue;
    const progress = goalProgress(goal, data.goalSaved(goal));
    const plan = monthlyPlan(goal, progress, today);
    if (plan.kind === "passed") {
      out.push({
        id: `goal-${goal.id}`,
        tone: "watch",
        text: `${goal.name} wasn't reached by its date.`,
        how: `${money(progress!.savedMinor)} saved of ${money(goal.target.amountMinor)}; the date was ${goal.targetDate}.`,
      });
    } else if (plan.kind === "monthly" && plan.amountMinor > Math.max(leftOver, 0)) {
      out.push({
        id: `goal-${goal.id}`,
        tone: "info",
        text: `${goal.name} needs ${money(plan.amountMinor)} a month, more than you've had left over on average lately.`,
        how: `${money(progress!.remainingMinor)} to go over ${plan.months} months; income minus spending averaged ${money(leftOver)} a month over the last 3 months.`,
      });
    }
  }

  return out;
}
