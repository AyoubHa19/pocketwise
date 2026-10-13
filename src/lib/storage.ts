import { isTransaction, type Transaction } from "@/lib/transactions";

export const TRANSACTIONS_STORAGE_KEY = "pocketwise.transactions";

// Saved next to the data. Bump it when the saved shape changes, so data
// saved by an older version of the app can be recognised and upgraded.
const STORAGE_VERSION = 1;

type SavedData = {
  version: number;
  transactions: Transaction[];
};

/** Reads the saved transactions. Returns [] if there are none yet. */
export function loadTransactions(): Transaction[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
  } catch {
    return []; // Storage is blocked, e.g. by the browser's privacy settings.
  }
  if (raw === null) return [];

  try {
    const data = JSON.parse(raw) as Partial<SavedData>;
    if (
      data.version !== STORAGE_VERSION ||
      !Array.isArray(data.transactions)
    ) {
      throw new Error("Unknown saved format");
    }
    const transactions = data.transactions.filter(isTransaction);
    if (transactions.length !== data.transactions.length) {
      replaceUnreadableData(raw, transactions); // Some entries were damaged.
    }
    return transactions;
  } catch {
    replaceUnreadableData(raw, []);
    return [];
  }
}

/**
 * Saves the transactions. Returns false if the browser refused, for example
 * because storage is full or blocked.
 */
export function saveTransactions(transactions: Transaction[]): boolean {
  const data: SavedData = { version: STORAGE_VERSION, transactions };
  try {
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

// Keeps a copy of data we couldn't read under another key, so it can still
// be recovered by hand, then saves what we could read in its place, so the
// same damage isn't backed up again on every page load.
function replaceUnreadableData(raw: string, readable: Transaction[]) {
  try {
    localStorage.setItem(`${TRANSACTIONS_STORAGE_KEY}.backup-${Date.now()}`, raw);
  } catch {
    return; // Couldn't back it up, so leave the original where it is.
  }
  saveTransactions(readable);
}
