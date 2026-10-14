import type { Money } from "@/lib/money";

/**
 * Income and expenses change what you have; a transfer only moves money
 * between two of your own accounts, so it's never counted as income or
 * spending (PRD 7.1, 10.1, 10.2).
 */
export type TransactionType = "income" | "expense" | "transfer";

/** The category every transfer has: it isn't spending on anything. */
export const TRANSFER_CATEGORY = "Transfer";

/** One money movement: something you earned or something you spent. */
export type Transaction = {
  id: string;
  type: TransactionType;
  /** Always positive. `type` says whether money came in or went out. */
  amount: Money;
  /**
   * The category's name (for a transfer, always TRANSFER_CATEGORY). The
   * server fills in the current name, so a renamed category shows its new
   * one everywhere.
   */
  category: string;
  /**
   * Which of the user's categories (src/lib/categories.ts) it's in; never
   * set on a transfer. Left out when saving, the server finds the category
   * by name.
   */
  categoryId?: string;
  /**
   * The calendar day as "YYYY-MM-DD", with no time or time zone,
   * so the day never shifts when the user travels or changes time zone.
   */
  date: string;
  /** Who was paid or paid you, or what it was: "Carrefour", "Netflix". */
  description?: string;
  note?: string;
  /** Free words to group by, as src/lib/tags.ts parses them. */
  tags?: string[];
  /**
   * The account it happened in; for a transfer, the one the money left.
   * Missing only on transactions from before accounts existed, until
   * they're assigned to one.
   */
  accountId?: string;
  /** For a transfer: the account the money went to. */
  toAccountId?: string;
};

/**
 * Checks that data from outside the app (like saved data) really has the
 * shape of a Transaction. TypeScript can't check data that only arrives
 * while the app is running, so we check each field by hand.
 */
export function isTransaction(value: unknown): value is Transaction {
  if (typeof value !== "object" || value === null) return false;
  const { id, type, amount, category, categoryId, date, description, note, tags, accountId, toAccountId } =
    value as Record<string, unknown>;
  if (typeof amount !== "object" || amount === null) return false;
  const { amountMinor, currency } = amount as Record<string, unknown>;
  // A transfer needs both ends, and they must differ, and has no category
  // id; others have no "to".
  const accountsOk =
    type === "transfer"
      ? typeof accountId === "string" &&
        typeof toAccountId === "string" &&
        accountId !== toAccountId &&
        category === TRANSFER_CATEGORY &&
        categoryId === undefined
      : (accountId === undefined || typeof accountId === "string") &&
        toAccountId === undefined &&
        (categoryId === undefined || typeof categoryId === "string");

  return (
    typeof id === "string" &&
    (type === "income" || type === "expense" || type === "transfer") &&
    accountsOk &&
    Number.isSafeInteger(amountMinor) &&
    (amountMinor as number) > 0 &&
    typeof currency === "string" &&
    typeof category === "string" &&
    typeof date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    (description === undefined || typeof description === "string") &&
    (note === undefined || typeof note === "string") &&
    (tags === undefined || (Array.isArray(tags) && tags.every((t) => typeof t === "string")))
  );
}

/** A unique id for a new transaction. */
export function newTransactionId(): string {
  // randomUUID only exists on secure pages (https or localhost), so fall back
  // when the app is opened over plain http, e.g. from a phone on the same Wi-Fi.
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Adds the transaction to the start of the list, or, if one with the same id
 * is already there, replaces it in place. Returns a new list.
 */
export function upsertTransaction(
  transactions: Transaction[],
  transaction: Transaction,
): Transaction[] {
  const exists = transactions.some((t) => t.id === transaction.id);
  return exists
    ? transactions.map((t) => (t.id === transaction.id ? transaction : t))
    : [transaction, ...transactions];
}

/** Returns a new list without the transaction that has this id. */
export function removeTransaction(
  transactions: Transaction[],
  id: string,
): Transaction[] {
  return transactions.filter((t) => t.id !== id);
}

/**
 * The amount with a minus sign for expenses, for display and totals. A
 * transfer has no sign (it neither adds nor takes away overall); totals
 * skip transfers themselves.
 */
export function signedAmount(transaction: Transaction): Money {
  const { amountMinor, currency } = transaction.amount;
  return {
    amountMinor: transaction.type === "expense" ? -amountMinor : amountMinor,
    currency,
  };
}
