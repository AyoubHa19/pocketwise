import { addMonths, monthOf } from "@/lib/dates";
import { signedAmount, type Transaction } from "@/lib/transactions";

/** Totals for one currency, all in minor units (e.g. cents). */
export type CurrencyTotals = {
  currency: string;
  incomeMinor: number;
  spendingMinor: number;
  /** Income minus spending: negative when more went out than came in. */
  balanceMinor: number;
};

/**
 * How much of the income went out again, as a whole percentage: 41 for 41%,
 * and over 100 when more was spent than came in. null when there was no
 * income to compare with.
 */
export function percentOfIncomeSpent(totals: CurrencyTotals): number | null {
  if (totals.incomeMinor <= 0) return null;
  return Math.round((totals.spendingMinor / totals.incomeMinor) * 100);
}

/** The transactions dated in `month`, written "YYYY-MM". */
export function transactionsInMonth(
  transactions: Transaction[],
  month: string,
): Transaction[] {
  return transactions.filter((t) => t.date.startsWith(`${month}-`));
}

/**
 * Adds up income and spending separately for each currency, since amounts in
 * different currencies can't be added without an exchange rate. The amounts
 * are whole numbers, so the sums are exact.
 *
 * `mainCurrency` always comes first, even with no transactions in it; any
 * other currencies follow, sorted by code.
 */
export function totalsByCurrency(
  transactions: Transaction[],
  mainCurrency: string,
): CurrencyTotals[] {
  const totals = new Map<string, CurrencyTotals>();

  function totalsFor(currency: string): CurrencyTotals {
    let entry = totals.get(currency);
    if (entry === undefined) {
      entry = { currency, incomeMinor: 0, spendingMinor: 0, balanceMinor: 0 };
      totals.set(currency, entry);
    }
    return entry;
  }

  totalsFor(mainCurrency);
  for (const transaction of transactions) {
    const entry = totalsFor(transaction.amount.currency);
    if (transaction.type === "income") {
      entry.incomeMinor += transaction.amount.amountMinor;
    } else {
      entry.spendingMinor += transaction.amount.amountMinor;
    }
  }

  const [main, ...others] = [...totals.values()]; // A Map keeps insertion order.
  for (const entry of [main, ...others]) {
    entry.balanceMinor = entry.incomeMinor - entry.spendingMinor;
  }
  others.sort((a, b) => a.currency.localeCompare(b.currency));
  return [main, ...others];
}

/** One day in the transaction list. */
export type DayGroup = {
  /** "YYYY-MM-DD" */
  date: string;
  /** In the order they were given, which is newest added first. */
  transactions: Transaction[];
  /**
   * Income minus spending that day, per currency, in minor units. Usually
   * one entry; more only when the day mixes currencies, which aren't added.
   */
  netByCurrency: { currency: string; netMinor: number }[];
};

/** Groups transactions by day, newest day first, with each day's net. */
export function groupByDay(transactions: Transaction[]): DayGroup[] {
  const byDate = new Map<string, Transaction[]>();
  for (const transaction of transactions) {
    const day = byDate.get(transaction.date);
    if (day) day.push(transaction);
    else byDate.set(transaction.date, [transaction]);
  }

  return [...byDate.entries()]
    // "YYYY-MM-DD" dates sort correctly as plain text.
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, dayTransactions]) => {
      const net = new Map<string, number>();
      for (const transaction of dayTransactions) {
        const { amountMinor, currency } = signedAmount(transaction);
        net.set(currency, (net.get(currency) ?? 0) + amountMinor);
      }
      return {
        date,
        transactions: dayTransactions,
        netByCurrency: [...net].map(([currency, netMinor]) => ({
          currency,
          netMinor,
        })),
      };
    });
}

/**
 * What the account held at the start of `date` ("YYYY-MM-DD"), before any
 * of that day's transactions. It can be zero or negative (an overdraft).
 */
export type OpeningBalance = {
  amountMinor: number;
  currency: string;
  date: string;
};

/** Checks that saved data really is an OpeningBalance. */
export function isOpeningBalance(value: unknown): value is OpeningBalance {
  if (typeof value !== "object" || value === null) return false;
  const { amountMinor, currency, date } = value as Record<string, unknown>;
  return (
    Number.isSafeInteger(amountMinor) &&
    typeof currency === "string" &&
    /^[A-Z]{3}$/.test(currency) &&
    typeof date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(date)
  );
}

/**
 * What the account holds on `today`: the opening balance plus every
 * transaction in its currency from its date up to and including today.
 * Transactions before that date are already part of the opening balance,
 * later-dated ones haven't happened yet, and other currencies can't be
 * added without an exchange rate.
 */
export function accountBalance(
  transactions: Transaction[],
  opening: OpeningBalance,
  today: string,
): number {
  let balance = opening.amountMinor;
  for (const transaction of transactions) {
    const { amountMinor, currency } = signedAmount(transaction);
    if (
      currency === opening.currency &&
      transaction.date >= opening.date &&
      transaction.date <= today
    ) {
      balance += amountMinor;
    }
  }
  return balance;
}

/**
 * The currencies of transactions that accountBalance leaves out because
 * they aren't in the balance's currency, sorted, so the user can be told
 * rather than have them silently missing. Only transactions in the
 * balance's date range count: the others are left out for every currency.
 */
export function currenciesLeftOut(
  transactions: Transaction[],
  opening: OpeningBalance,
  today: string,
): string[] {
  const left = new Set<string>();
  for (const { amount, date } of transactions) {
    if (amount.currency !== opening.currency && date >= opening.date && date <= today) {
      left.add(amount.currency);
    }
  }
  return [...left].sort();
}

/** One category's spending, for the "Spending by category" chart. */
export type CategorySpending = {
  category: string;
  amountMinor: number;
  /** Its share of all the spending, as a whole percentage. */
  percent: number;
};

/**
 * Spending in `currency` per category, biggest first (ties by name), each
 * with its share of the total. Income and other currencies are left out.
 * The rounded shares may add up to 99 or 101; each one is still correct.
 */
export function spendingByCategory(
  transactions: Transaction[],
  currency: string,
): CategorySpending[] {
  const totals = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.type !== "expense") continue;
    if (transaction.amount.currency !== currency) continue;
    const { category } = transaction;
    totals.set(category, (totals.get(category) ?? 0) + transaction.amount.amountMinor);
  }
  const total = [...totals.values()].reduce((sum, amount) => sum + amount, 0);
  return [...totals]
    .map(([category, amountMinor]) => ({
      category,
      amountMinor,
      percent: Math.round((amountMinor / total) * 100),
    }))
    .sort((a, b) => b.amountMinor - a.amountMinor || a.category.localeCompare(b.category));
}

/** One month's totals, for the "Last 6 months" chart. */
export type MonthTotals = {
  /** "YYYY-MM" */
  month: string;
  incomeMinor: number;
  spendingMinor: number;
};

/**
 * Income and spending in `currency` for the `count` months that end with
 * `lastMonth`, oldest first. Months without transactions are included at
 * zero, so the chart always has the same number of columns.
 */
export function monthlyTotals(
  transactions: Transaction[],
  lastMonth: string,
  count: number,
  currency: string,
): MonthTotals[] {
  const months = Array.from({ length: count }, (_, index) =>
    addMonths(lastMonth, index - count + 1),
  );
  const byMonth = new Map(
    months.map((month) => [month, { month, incomeMinor: 0, spendingMinor: 0 }]),
  );
  for (const transaction of transactions) {
    if (transaction.amount.currency !== currency) continue;
    const entry = byMonth.get(monthOf(transaction.date));
    if (!entry) continue;
    if (transaction.type === "income") {
      entry.incomeMinor += transaction.amount.amountMinor;
    } else {
      entry.spendingMinor += transaction.amount.amountMinor;
    }
  }
  return months.map((month) => byMonth.get(month)!);
}
