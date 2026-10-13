import type { Transaction } from "@/lib/transactions";

/** Totals for one currency, all in minor units (e.g. cents). */
export type CurrencyTotals = {
  currency: string;
  incomeMinor: number;
  spendingMinor: number;
  /** Income minus spending: negative when more went out than came in. */
  balanceMinor: number;
};

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
