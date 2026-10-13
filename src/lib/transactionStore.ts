import { useSyncExternalStore } from "react";
import {
  loadTransactions,
  saveTransactions,
  TRANSACTIONS_STORAGE_KEY,
} from "@/lib/storage";
import type { Transaction } from "@/lib/transactions";

// One shared copy of the transactions for the whole page, read from storage
// the first time a component asks for it. Components read it with
// useTransactions() and change it with updateTransactions().
let current: Transaction[] | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): Transaction[] {
  current ??= loadTransactions();
  return current;
}

// The server has no access to the browser's storage, so it renders a
// "not loaded yet" state and the browser fills in the real list.
function getServerSnapshot(): null {
  return null;
}

function notifyListeners() {
  for (const listener of listeners) listener();
}

// Another tab saved changes: reload them, so this tab doesn't overwrite them.
// (key is null when all storage was cleared.)
function handleStorageEvent(event: StorageEvent) {
  if (event.key === TRANSACTIONS_STORAGE_KEY || event.key === null) {
    current = loadTransactions();
    notifyListeners();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener("storage", handleStorageEvent);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("storage", handleStorageEvent);
    }
  };
}

/** The saved transactions, or null while the page hasn't read them yet. */
export function useTransactions(): Transaction[] | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Changes the transactions and saves them. The change shows on screen even
 * if saving fails; the return value says whether it was saved.
 */
export function updateTransactions(
  update: (previous: Transaction[]) => Transaction[],
): boolean {
  current = update(getSnapshot());
  notifyListeners();
  return saveTransactions(current);
}
