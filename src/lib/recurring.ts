import { addDays, addMonths, monthOf } from "@/lib/dates";
import type { Money } from "@/lib/money";
import type { Transaction } from "@/lib/transactions";

// Recurring transactions and bills (PRD 14): rent on the 1st, a monthly
// subscription, a salary. A rule only says what's expected and when; it
// never adds anything by itself, so a bill that hasn't been paid is never
// counted as paid. Each time it's due ("an occurrence"), the user either
// records it, which saves an ordinary transaction, or skips it.
//
// Recording is idempotent: an occurrence's transaction always has the same
// id (occurrenceId), and saving a transaction with an id that already
// exists updates it rather than adding a copy, so the same occurrence can
// never be recorded twice. Editing, pausing or deleting a rule never
// touches the transactions already recorded.

export type Frequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
export const FREQUENCIES: Frequency[] = ["weekly", "biweekly", "monthly", "quarterly", "yearly"];
export const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: "Every week",
  biweekly: "Every 2 weeks",
  monthly: "Every month",
  quarterly: "Every 3 months",
  yearly: "Every year",
};

export type RecurringRule = {
  id: string;
  /** What it is: "Rent", "Phone bill", "Salary". */
  name: string;
  type: "income" | "expense";
  amount: Money;
  categoryId: string;
  /** The account it's paid from or into; null for the default one. */
  accountId: string | null;
  frequency: Frequency;
  /** The first time it's due, "YYYY-MM-DD"; later ones follow from it. */
  startDate: string;
  /** The last day it can be due, or null for no end. */
  endDate: string | null;
  /**
   * Occurrences before this day are history, never shown as overdue: the
   * day the rule was made (or resumed), so a salary started years ago
   * doesn't arrive with years of "missed" payments.
   */
  trackFrom: string;
  paused: boolean;
  /** Show it as coming up this many days before it's due (0: on the day). */
  remindDays: number;
  /** Occurrences the user chose to skip. */
  skipped: string[];
};

export const MAX_RULE_NAME_LENGTH = 40;
export const MAX_REMIND_DAYS = 30;
export const DEFAULT_REMIND_DAYS = 3;

/** The id of the transaction that records the rule's occurrence on `date`. */
export function occurrenceId(ruleId: string, date: string): string {
  return `recurring-${ruleId}-${date}`;
}

/** The last day of a "YYYY-MM" month, as a number. */
function daysIn(month: string): number {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

/**
 * The rule's `n`th occurrence (0 is the start date). Monthly dates keep
 * the start's day of the month, moved to the month's last day when it's
 * shorter: a rule starting Jan 31 is due Feb 28 (or 29), then Mar 31, never
 * drifting to the 28th for good.
 */
export function nthOccurrence(rule: Pick<RecurringRule, "frequency" | "startDate">, n: number): string {
  const { frequency, startDate } = rule;
  if (frequency === "weekly") return addDays(startDate, 7 * n);
  if (frequency === "biweekly") return addDays(startDate, 14 * n);
  const step = frequency === "monthly" ? 1 : frequency === "quarterly" ? 3 : 12;
  const month = addMonths(monthOf(startDate), step * n);
  const day = Math.min(Number(startDate.slice(8, 10)), daysIn(month));
  return `${month}-${String(day).padStart(2, "0")}`;
}

/** The rule's occurrences from `from` to `to`, both included, in order. */
export function occurrencesBetween(
  rule: Pick<RecurringRule, "frequency" | "startDate" | "endDate">,
  from: string,
  to: string,
): string[] {
  const last = rule.endDate !== null && rule.endDate < to ? rule.endDate : to;
  const dates: string[] = [];
  // Weekly rules over decades are a few thousand steps at most.
  for (let n = 0; n < 10000; n++) {
    const date = nthOccurrence(rule, n);
    if (date > last) break;
    if (date >= from) dates.push(date);
  }
  return dates;
}

export type OccurrenceState = "paid" | "skipped" | "overdue" | "today" | "soon" | "later";

export type Occurrence = {
  rule: RecurringRule;
  date: string;
  state: OccurrenceState;
  /** The transaction that recorded it, when it has been. */
  transaction?: Transaction;
};

/**
 * The rule's occurrences from the day it's tracked from up to `until`,
 * each with its state: recorded ("paid", which for income means
 * received), skipped, overdue (its day has passed), due today, coming up
 * soon (within the reminder), or later. A paused rule has none.
 */
export function occurrences(
  rule: RecurringRule,
  transactions: Transaction[],
  today: string,
  until: string,
): Occurrence[] {
  if (rule.paused) return [];
  const byId = new Map(transactions.map((t) => [t.id, t]));
  return occurrencesBetween(rule, rule.trackFrom, until).map((date) => {
    const transaction = byId.get(occurrenceId(rule.id, date));
    const state: OccurrenceState = transaction
      ? "paid"
      : rule.skipped.includes(date)
        ? "skipped"
        : date < today
          ? "overdue"
          : date === today
            ? "today"
            : date <= addDays(today, rule.remindDays)
              ? "soon"
              : "later";
    return { rule, date, state, ...(transaction && { transaction }) };
  });
}

/** The rule's next occurrence still to record (overdue first), or null. */
export function nextDue(rule: RecurringRule, transactions: Transaction[], today: string): Occurrence | null {
  // A year ahead is enough to find the next one for every frequency.
  return (
    occurrences(rule, transactions, today, addDays(today, 400)).find(
      (o) => o.state !== "paid" && o.state !== "skipped",
    ) ?? null
  );
}

/**
 * What needs attention across all rules: every overdue occurrence, and the
 * ones due today or within their reminder, soonest first.
 */
export function needsAttention(rules: RecurringRule[], transactions: Transaction[], today: string): Occurrence[] {
  return rules
    .flatMap((rule) =>
      occurrences(rule, transactions, today, addDays(today, rule.remindDays)).filter(
        (o) => o.state === "overdue" || o.state === "today" || o.state === "soon",
      ),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.rule.name.localeCompare(b.rule.name));
}

/**
 * The transaction that records the rule's occurrence on `date`, filled in
 * for the user to check (they may have paid a different amount, or on
 * another day) before saving. Its id is the occurrence's, which is what
 * makes recording it twice impossible.
 */
export function draftFor(rule: RecurringRule, date: string, categoryName: string): Transaction {
  return {
    id: occurrenceId(rule.id, date),
    type: rule.type,
    amount: rule.amount,
    category: categoryName,
    categoryId: rule.categoryId,
    date,
    description: rule.name,
    ...(rule.accountId !== null && { accountId: rule.accountId }),
  };
}

/** "YYYY-MM-DD" that is a real calendar day. */
function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return utc.getUTCFullYear() === y && utc.getUTCMonth() === m - 1 && utc.getUTCDate() === d;
}

/**
 * What's wrong with these rule values, or null if nothing is. Used by the
 * form and, again, by the server.
 */
export function ruleProblem(
  values: Pick<RecurringRule, "name" | "amount" | "frequency" | "startDate" | "endDate" | "remindDays">,
): string | null {
  const name = values.name.trim();
  if (name.length === 0) return "Give it a name, like Rent or Phone bill.";
  if (name.length > MAX_RULE_NAME_LENGTH) return `A name can be up to ${MAX_RULE_NAME_LENGTH} characters.`;
  if (!Number.isSafeInteger(values.amount.amountMinor) || values.amount.amountMinor <= 0) {
    return "Enter an amount greater than zero.";
  }
  if (!FREQUENCIES.includes(values.frequency)) return "Choose how often it repeats.";
  if (!isDate(values.startDate)) return "Pick the first date it's due.";
  if (values.endDate !== null) {
    if (!isDate(values.endDate)) return "Pick a real end date.";
    if (values.endDate < values.startDate) return "The end date is before the first date.";
  }
  if (!Number.isInteger(values.remindDays) || values.remindDays < 0 || values.remindDays > MAX_REMIND_DAYS) {
    return `The reminder is 0 to ${MAX_REMIND_DAYS} days before.`;
  }
  return null;
}
