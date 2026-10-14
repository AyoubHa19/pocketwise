import { addDays } from "@/lib/dates";
import type { Money } from "@/lib/money";
import { FREQUENCIES, nthOccurrence, type Frequency } from "@/lib/recurring";
import type { Transaction } from "@/lib/transactions";

// Debts and installments (PRD 18), tracked by hand. What the user entered
// (the balance from a statement, the installment, the rate if known) is
// kept apart from what Pocketwise works out from it, and every worked-out
// figure says so.
//
// Payments are ordinary expenses (category "Debt Payments"), recorded once:
// they count as spending like any other, and they bring the debt down.
// The debt's balance itself is never added to spending, so nothing is
// counted twice. A payment belongs to a debt by its id: `debt-<debtId>-…`
// when recorded from the debt, or `recurring-<ruleId>-…` when the debt is
// paid through a recurring item.
//
// Interest: only with a rate the user gave (never assumed). Each payment
// period adds interest on what's left, at the annual rate ÷ payments per
// year, rounded to the smallest unit; then the payment comes off. The
// last payment is only what's left.

export type Debt = {
  id: string;
  name: string;
  currency: string;
  /** What's owed, as the user entered it (from a statement), on `balanceDate`. */
  balanceMinor: number;
  balanceDate: string;
  /** The usual installment. */
  paymentMinor: number;
  frequency: Frequency;
  /** When the next installment is due, if known. */
  nextDue: string | null;
  /** The yearly interest rate in percent ("12.5"), or null when not known. */
  annualRate: string | null;
  /** The amount first borrowed, if the user knows it. */
  originalMinor: number | null;
  /** A recurring item that pays it, so those payments count too. */
  ruleId: string | null;
  archived: boolean;
};

export const MAX_DEBT_NAME_LENGTH = 40;
export const PER_YEAR: Record<Frequency, number> = { weekly: 52, biweekly: 26, monthly: 12, quarterly: 4, yearly: 1 };

/** The id for a payment recorded from the debt itself. */
export function debtPaymentId(debtId: string, unique: string): string {
  return `debt-${debtId}-${unique}`;
}

/** The transactions that pay this debt, in its currency. */
export function debtPayments(debt: Debt, transactions: Transaction[]): Transaction[] {
  return transactions.filter(
    (t) =>
      t.type === "expense" &&
      t.amount.currency === debt.currency &&
      (t.id.startsWith(`debt-${debt.id}-`) || (debt.ruleId !== null && t.id.startsWith(`recurring-${debt.ruleId}-`))),
  );
}

export type DebtStatus = {
  /** Payments on or after the balance's date (the balance is the one before that day's payment). */
  paidSinceMinor: number;
  payments: Transaction[];
  /** Balance − payments since: an estimate, interest since the statement not included. */
  remainingMinor: number;
  paidOff: boolean;
};

export function debtStatus(debt: Debt, transactions: Transaction[]): DebtStatus {
  const payments = debtPayments(debt, transactions)
    .filter((t) => t.date >= debt.balanceDate)
    .sort((a, b) => a.date.localeCompare(b.date));
  const paidSinceMinor = payments.reduce((sum, t) => sum + t.amount.amountMinor, 0);
  const remainingMinor = Math.max(debt.balanceMinor - paidSinceMinor, 0);
  return { paidSinceMinor, payments, remainingMinor, paidOff: remainingMinor === 0 };
}

/** The rate as a number (12.5), or null if not given or malformed. */
export function parseRate(rate: string | null): number | null {
  if (rate === null) return null;
  if (!/^\d{1,3}(\.\d{1,3})?$/.test(rate.trim())) return null;
  const value = Number(rate);
  return value <= 100 ? value : null;
}

export type Payoff =
  | {
      kind: "paid-off";
      /** How many payments it takes. */
      payments: number;
      /** The day of the last one, when the next due date is known. */
      lastDate: string | null;
      /** Total interest along the way; null when the rate isn't known. */
      interestMinor: number | null;
      /** Everything paid: what's left plus interest. */
      totalMinor: number | null;
    }
  /** The payment doesn't cover the interest: the debt never goes down. */
  | { kind: "never" }
  /** More than 100 years of payments: too long to be a plan. */
  | { kind: "too-long" };

const MAX_PAYMENTS = 100 * 52;

/**
 * How paying `paymentMinor` each period clears `remainingMinor`, at the
 * debt's rate if known (see the formula at the top). Without a rate, it
 * counts payments only and says interest is unknown, rather than assuming
 * none.
 */
export function payoff(debt: Debt, remainingMinor: number, paymentMinor = debt.paymentMinor): Payoff {
  const rate = parseRate(debt.annualRate);
  const perPeriod = rate === null ? 0 : rate / 100 / PER_YEAR[debt.frequency];
  if (remainingMinor <= 0) return { kind: "paid-off", payments: 0, lastDate: null, interestMinor: rate === null ? null : 0, totalMinor: 0 };
  if (paymentMinor <= 0) return { kind: "never" };
  let balance = remainingMinor;
  let interest = 0;
  let count = 0;
  while (balance > 0) {
    const charged = Math.round(balance * perPeriod);
    if (charged >= paymentMinor) return { kind: "never" };
    balance += charged;
    interest += charged;
    balance -= Math.min(paymentMinor, balance);
    count++;
    if (count > MAX_PAYMENTS) return { kind: "too-long" };
  }
  return {
    kind: "paid-off",
    payments: count,
    lastDate: debt.nextDue === null ? null : nthOccurrence({ frequency: debt.frequency, startDate: debt.nextDue }, count - 1),
    interestMinor: rate === null ? null : interest,
    totalMinor: rate === null ? null : remainingMinor + interest,
  };
}

/** "YYYY-MM-DD" that is a real calendar day. */
function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return utc.getUTCFullYear() === y && utc.getUTCMonth() === m - 1 && utc.getUTCDate() === d;
}

/** What's wrong with these debt values, or null. Used by the form and, again, by the server. */
export function debtProblem(values: Omit<Debt, "id" | "archived">, today: string): string | null {
  const name = values.name.trim();
  if (name.length === 0) return "Give the debt a name, like Car loan.";
  if (name.length > MAX_DEBT_NAME_LENGTH) return `A name can be up to ${MAX_DEBT_NAME_LENGTH} characters.`;
  const whole = (n: number) => Number.isSafeInteger(n) && n > 0;
  if (!whole(values.balanceMinor)) return "Enter what's still owed, more than zero.";
  if (!whole(values.paymentMinor)) return "Enter the installment, more than zero.";
  if (values.originalMinor !== null && !whole(values.originalMinor)) return "The amount borrowed must be more than zero.";
  if (!FREQUENCIES.includes(values.frequency)) return "Choose how often you pay.";
  if (!isDate(values.balanceDate) || values.balanceDate > addDays(today, 1)) return "Pick the date of that balance, today or earlier.";
  if (values.nextDue !== null && !isDate(values.nextDue)) return "Pick a real date for the next installment.";
  if (values.annualRate !== null && parseRate(values.annualRate) === null) {
    return "Enter the yearly rate as a percent from 0 to 100, like 12.5, or leave it empty if you don't know it.";
  }
  return null;
}

/** What an amount paid at `frequency` comes to per month, on average over a year. */
export function perMonthMinor(amount: Money, frequency: Frequency): number {
  return Math.round((amount.amountMinor * PER_YEAR[frequency]) / 12);
}
