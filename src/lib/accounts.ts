// The user's money accounts: cash, bank accounts, cards... Each has its own
// currency and, once the user gives it, a starting balance. Its balance
// today is that start plus what happened in it since (see accountBalances
// in summary.ts).

export const ACCOUNT_TYPES = ["cash", "bank", "savings", "wallet", "other"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: "Cash",
  bank: "Bank",
  savings: "Savings",
  wallet: "Wallet",
  other: "Other",
};

/** What the account held at the start of a day, before that day's entries. */
export type AccountOpening = {
  /** Minor units; can be zero or negative (an overdraft). */
  amountMinor: number;
  /** "YYYY-MM-DD" */
  date: string;
};

/** An account as the app sees it. */
export type Account = {
  id: string;
  name: string;
  type: AccountType;
  /** Every entry in the account is in this currency. */
  currency: string;
  /** null until the user gives a starting balance: no balance is shown then. */
  opening: AccountOpening | null;
  /** Hidden from choices, history kept. */
  archived: boolean;
};

export const MAX_ACCOUNT_NAME_LENGTH = 40;

export function isAccountType(value: unknown): value is AccountType {
  return typeof value === "string" && (ACCOUNT_TYPES as readonly string[]).includes(value);
}

/**
 * The name for an account made automatically for a currency: "Main account",
 * or "Main account (EUR)" when the user has money in more than one currency,
 * so the names stay apart.
 */
export function defaultAccountName(currency: string, currencyCount: number): string {
  return currencyCount > 1 ? `Main account (${currency})` : "Main account";
}
