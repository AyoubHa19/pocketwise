import type { Account } from "@/lib/accounts";
import { addDays } from "@/lib/dates";
import { occurrences, occurrencesBetween, type Occurrence, type RecurringRule } from "@/lib/recurring";
import { accountBalances } from "@/lib/summary";
import type { Transaction } from "@/lib/transactions";

// Safe-to-spend and the pay-period planner (PRD 15, 16). Everything is in
// the main currency, until the end of the pay period (the next payday).
//
//   safe to spend = balance of the chosen accounts, today
//                 − bills due before payday that aren't recorded yet
//                 − spending already recorded with a later date, before payday
//                 − planned savings for the period
//                 − the reserve the user keeps aside
//
// - Expected income (the next salary included) is never added: it isn't
//   money yet. It's listed apart.
// - Each bill is subtracted once: one recorded up to today is already out
//   of the balance; one recorded with a later date isn't yet, so it's
//   subtracted as "recorded with a later date"; an unrecorded one is
//   subtracted as a bill (overdue ones too: they're still to pay). Skipped
//   ones aren't.
// - An account without a starting balance has no known balance: it's left
//   out and named, never guessed.
// It's an estimate to help plan, and the page says so.

/** What the user sets for the plan; kept in their account. */
export type PlanSettings = {
  /** Money kept aside, never counted as spendable (minor units, ≥ 0). */
  reserveMinor: number;
  /** What the user means to save this period (minor units, ≥ 0). */
  savingsMinor: number;
  /** The accounts to count, or null for every open one in the main currency. */
  accountIds: string[] | null;
  /** The recurring income that marks payday, or null. */
  salaryRuleId: string | null;
  /** A payday the user chose ("YYYY-MM-DD"), when there's no salary rule. */
  payday: string | null;
};

export const DEFAULT_PLAN: PlanSettings = {
  reserveMinor: 0,
  savingsMinor: 0,
  accountIds: null,
  salaryRuleId: null,
  payday: null,
};

export type PayPeriod = {
  /** The day the period started (the last payday), "YYYY-MM-DD". */
  start: string;
  /** The next payday: the period runs until the day before it. */
  end: string;
  /** Days left, today included, up to the day before payday (at least 1). */
  daysLeft: number;
  /** Where payday comes from. */
  source: "salary" | "date";
  rule?: RecurringRule;
};

/** Whole days from `a` to `b` ("YYYY-MM-DD"). */
export function daysBetween(a: string, b: string): number {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/**
 * The current pay period, or null when there's no payday to plan to. With
 * a salary rule, payday is its next occurrence from today on that isn't
 * recorded yet (a salary already received today moves it to the next),
 * and the period started at the occurrence before. With a chosen date, the
 * period started at the last income recorded before today (else the 1st of
 * the month). Works for any pay frequency (PRD 16).
 */
export function payPeriod(
  settings: PlanSettings,
  rules: RecurringRule[],
  transactions: Transaction[],
  today: string,
): PayPeriod | null {
  const rule = rules.find((r) => r.id === settings.salaryRuleId && r.type === "income");
  if (rule && !rule.paused) {
    const next = occurrences(rule, transactions, today, addDays(today, 400)).find(
      (o) => o.date >= today && o.state !== "paid" && o.state !== "skipped",
    );
    if (next) {
      const before = occurrencesBetween(rule, addDays(next.date, -400), addDays(next.date, -1));
      const start = before[before.length - 1] ?? (rule.startDate < next.date ? rule.startDate : today);
      return { start, end: next.date, daysLeft: Math.max(daysBetween(today, next.date), 1), source: "salary", rule };
    }
  }
  if (settings.payday && settings.payday >= today) {
    const lastIncome = transactions
      .filter((t) => t.type === "income" && t.date <= today)
      .reduce<string | null>((latest, t) => (latest === null || t.date > latest ? t.date : latest), null);
    return {
      start: lastIncome ?? `${today.slice(0, 7)}-01`,
      end: settings.payday,
      daysLeft: Math.max(daysBetween(today, settings.payday), 1),
      source: "date",
    };
  }
  return null;
}

export type SafeToSpend = {
  period: PayPeriod;
  /** Accounts counted, with their balances. */
  accounts: { account: Account; balanceMinor: number }[];
  /** Chosen accounts left out: no starting balance, or another currency. */
  leftOut: { account: Account; reason: "no-balance" | "other-currency" }[];
  balanceMinor: number;
  /** Unrecorded bills due before payday, in the main currency. */
  bills: Occurrence[];
  billsMinor: number;
  /** Spending already recorded with a date after today and before payday, in the counted accounts. */
  later: Transaction[];
  laterMinor: number;
  /** Bills before payday in other currencies: not subtracted, named. */
  otherCurrencyBills: Occurrence[];
  savingsMinor: number;
  reserveMinor: number;
  /** The result: below zero means short by that much. */
  resultMinor: number;
  /** result ÷ days left, rounded down; 0 when the result is below zero. */
  perDayMinor: number;
  /** Income expected from today up to payday: shown, never counted. */
  expectedIncome: Occurrence[];
};

/** Safe-to-spend until the next payday, with every part of the sum. Null without a pay period. */
export function safeToSpend(
  settings: PlanSettings,
  data: { accounts: Account[]; transactions: Transaction[]; rules: RecurringRule[]; mainCurrency: string; today: string },
): SafeToSpend | null {
  const period = payPeriod(settings, data.rules, data.transactions, data.today);
  if (!period) return null;

  const open = data.accounts.filter((a) => !a.archived);
  const chosen =
    settings.accountIds === null
      ? open.filter((a) => a.currency === data.mainCurrency)
      : open.filter((a) => settings.accountIds!.includes(a.id));
  const balances = accountBalances(chosen, data.transactions, data.today);
  const accounts: SafeToSpend["accounts"] = [];
  const leftOut: SafeToSpend["leftOut"] = [];
  for (const account of chosen) {
    const balance = balances.get(account.id);
    if (account.currency !== data.mainCurrency) leftOut.push({ account, reason: "other-currency" });
    else if (balance === null || balance === undefined) leftOut.push({ account, reason: "no-balance" });
    else accounts.push({ account, balanceMinor: balance });
  }
  const balanceMinor = accounts.reduce((sum, a) => sum + a.balanceMinor, 0);

  // Due before payday: every unrecorded, unskipped occurrence up to the day before it.
  const lastDay = addDays(period.end, -1);
  const due = data.rules.flatMap((rule) =>
    occurrences(rule, data.transactions, data.today, lastDay).filter(
      (o) => o.state !== "paid" && o.state !== "skipped",
    ),
  );
  const byDate = (a: Occurrence, b: Occurrence) => a.date.localeCompare(b.date) || a.rule.name.localeCompare(b.rule.name);
  const expenses = due.filter((o) => o.rule.type === "expense").sort(byDate);
  const bills = expenses.filter((o) => o.rule.amount.currency === data.mainCurrency);
  const otherCurrencyBills = expenses.filter((o) => o.rule.amount.currency !== data.mainCurrency);
  const billsMinor = bills.reduce((sum, o) => sum + o.rule.amount.amountMinor, 0);
  // Recorded ahead of time: not in today's balance yet, still to go out.
  const counted = new Set(accounts.map((a) => a.account.id));
  const later = data.transactions
    .filter(
      (t) =>
        t.type === "expense" &&
        t.amount.currency === data.mainCurrency &&
        t.date > data.today &&
        t.date <= lastDay &&
        t.accountId !== undefined &&
        counted.has(t.accountId),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const laterMinor = later.reduce((sum, t) => sum + t.amount.amountMinor, 0);
  // Income from today up to and including payday itself (an older one not
  // recorded isn't coming: it's just not recorded).
  const expectedIncome = data.rules
    .flatMap((rule) =>
      occurrences(rule, data.transactions, data.today, period.end).filter(
        (o) => o.rule.type === "income" && o.date >= data.today && o.state !== "paid" && o.state !== "skipped",
      ),
    )
    .sort(byDate);

  const resultMinor = balanceMinor - billsMinor - laterMinor - settings.savingsMinor - settings.reserveMinor;
  return {
    period,
    accounts,
    leftOut,
    balanceMinor,
    bills,
    billsMinor,
    later,
    laterMinor,
    otherCurrencyBills,
    savingsMinor: settings.savingsMinor,
    reserveMinor: settings.reserveMinor,
    resultMinor,
    perDayMinor: resultMinor > 0 ? Math.floor(resultMinor / period.daysLeft) : 0,
    expectedIncome,
  };
}

/**
 * What was spent in the main currency since the period started (its first
 * day included, up to today), and the average per day so far, for
 * comparing with what's safe per day.
 */
export function spentThisPeriod(
  transactions: Transaction[],
  period: PayPeriod,
  mainCurrency: string,
  today: string,
): { spentMinor: number; days: number; perDayMinor: number } {
  const spentMinor = transactions
    .filter(
      (t) =>
        t.type === "expense" && t.amount.currency === mainCurrency && t.date >= period.start && t.date <= today,
    )
    .reduce((sum, t) => sum + t.amount.amountMinor, 0);
  const days = Math.max(daysBetween(period.start, today) + 1, 1);
  return { spentMinor, days, perDayMinor: Math.round(spentMinor / days) };
}

/** "YYYY-MM-DD" that is a real calendar day. */
function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return utc.getUTCFullYear() === y && utc.getUTCMonth() === m - 1 && utc.getUTCDate() === d;
}

/** What's wrong with these settings, or null. Used by the form and, again, by the server. */
export function planProblem(settings: PlanSettings): string | null {
  for (const [value, name] of [
    [settings.reserveMinor, "The reserve"],
    [settings.savingsMinor, "Planned savings"],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < 0) return `${name} must be zero or more.`;
  }
  if (settings.payday !== null && !isDate(settings.payday)) return "Pick a real payday.";
  if (settings.accountIds !== null && settings.accountIds.length > 100) return "Too many accounts.";
  return null;
}
