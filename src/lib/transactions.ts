import type { Money } from "@/lib/money";

export type TransactionType = "income" | "expense";

/** One money movement: something you earned or something you spent. */
export type Transaction = {
  id: string;
  type: TransactionType;
  /** Always positive. `type` says whether money came in or went out. */
  amount: Money;
  category: string;
  /**
   * The calendar day as "YYYY-MM-DD", with no time or time zone,
   * so the day never shifts when the user travels or changes time zone.
   */
  date: string;
  note?: string;
};

/** The amount with a minus sign for expenses, for display and totals. */
export function signedAmount(transaction: Transaction): Money {
  const { amountMinor, currency } = transaction.amount;
  return {
    amountMinor: transaction.type === "expense" ? -amountMinor : amountMinor,
    currency,
  };
}
