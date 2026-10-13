import type { Settings } from "@/lib/settingsStore";
import type { Transaction } from "@/lib/transactions";

// Moving the data saved in this browser (from before accounts existed) into
// the signed-in account. The rules are plain functions here, so they can be
// tested; the screen is LocalDataImport.tsx, the server side importLocal in
// convex/transactions.ts and convex/settings.ts.

/** How many transactions are sent per request. The server refuses more. */
export const IMPORT_BATCH_SIZE = 200;

/** Splits a list into pieces of at most `size`, keeping the order. */
export function batches<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

/** Whether this browser has anything worth moving. */
export function hasLocalData(settings: Settings, transactions: Transaction[]): boolean {
  return (
    transactions.length > 0 ||
    settings.currency !== null ||
    settings.openingBalance !== null
  );
}

/**
 * The check after moving: every transaction from the browser must now be in
 * the account, found by its id. A copy already in the account counts even if
 * it was edited there since, because the account's version is kept on
 * purpose. Returns the ids that are missing; empty means it all arrived.
 */
export function missingAfterImport(local: Transaction[], account: Transaction[]): string[] {
  const inAccount = new Set(account.map((t) => t.id));
  return local.filter((t) => !inAccount.has(t.id)).map((t) => t.id);
}

/**
 * Remembered in this browser once its data has been moved or set aside, so
 * the offer isn't made again, including to anyone else who signs in here:
 * the browser's old data belongs to whoever used it before accounts.
 */
export type ImportMarker = {
  status: "imported" | "dismissed";
  /** When it happened, as milliseconds since 1970. */
  at: number;
};

export const IMPORT_MARKER_KEY = "pocketwise.localImport";

export function isImportMarker(value: unknown): value is ImportMarker {
  if (typeof value !== "object" || value === null) return false;
  const { status, at } = value as Record<string, unknown>;
  return (status === "imported" || status === "dismissed") && typeof at === "number";
}

/** The marker, or null if there's none (or storage can't be read). */
export function readImportMarker(): ImportMarker | null {
  try {
    const raw = localStorage.getItem(IMPORT_MARKER_KEY);
    if (raw === null) return null;
    const value: unknown = JSON.parse(raw);
    return isImportMarker(value) ? value : null;
  } catch {
    return null;
  }
}

/** Every key Pocketwise uses in the browser starts with this. */
export const LOCAL_KEY_PREFIX = "pocketwise.";

/**
 * Deletes everything Pocketwise saved in this browser: the old
 * transactions and settings, their backups, and the import marker. The
 * account isn't touched. Returns how many entries were removed, or null if
 * the browser wouldn't allow it.
 */
export function clearLocalData(): number | null {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LOCAL_KEY_PREFIX)) keys.push(key);
    }
    // Collected first: removing while counting would skip entries.
    for (const key of keys) localStorage.removeItem(key);
    return keys.length;
  } catch {
    return null;
  }
}

/** Saves the marker. Returns whether the browser let it be saved. */
export function writeImportMarker(status: ImportMarker["status"]): boolean {
  try {
    localStorage.setItem(IMPORT_MARKER_KEY, JSON.stringify({ status, at: Date.now() }));
    return true;
  } catch {
    return false;
  }
}
