import type { Money } from "@/lib/money";

export type TransactionType = "income" | "expense";

export const CATEGORIES = [
  "Salary",
  "Food",
  "Rent",
  "Transport",
  "Shopping",
  "Bills",
  "Health",
  "Other",
] as const;

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

/**
 * Checks that data from outside the app (like saved data) really has the
 * shape of a Transaction. TypeScript can't check data that only arrives
 * while the app is running, so we check each field by hand.
 */
export function isTransaction(value: unknown): value is Transaction {
  if (typeof value !== "object" || value === null) return false;
  const { id, type, amount, category, date, note } = value as Record<
    string,
    unknown
  >;
  if (typeof amount !== "object" || amount === null) return false;
  const { amountMinor, currency } = amount as Record<string, unknown>;

  return (
    typeof id === "string" &&
    (type === "income" || type === "expense") &&
    Number.isSafeInteger(amountMinor) &&
    (amountMinor as number) > 0 &&
    typeof currency === "string" &&
    typeof category === "string" &&
    typeof date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    (note === undefined || typeof note === "string")
  );
}

/** A unique id for a new transaction. */
export function newTransactionId(): string {
  // randomUUID only exists on secure pages (https or localhost), so fall back
  // when the app is opened over plain http, e.g. from a phone on the same Wi-Fi.
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** The amount with a minus sign for expenses, for display and totals. */
export function signedAmount(transaction: Transaction): Money {
  const { amountMinor, currency } = transaction.amount;
  return {
    amountMinor: transaction.type === "expense" ? -amountMinor : amountMinor,
    currency,
  };
}
