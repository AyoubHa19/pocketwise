// Since accounts (Stage 12), the app keeps its data in the signed-in
// account (src/lib/accountData.ts). This store only reads what the browser
// saved before that, so LocalDataImport can offer to move it.
import { useSyncExternalStore } from "react";
import { createStorageStore } from "@/lib/createStorageStore";
import {
  loadTransactions,
  saveTransactions,
  TRANSACTIONS_STORAGE_KEY,
} from "@/lib/storage";
import type { Transaction } from "@/lib/transactions";

const store = createStorageStore({
  key: TRANSACTIONS_STORAGE_KEY,
  load: loadTransactions,
  save: saveTransactions,
});

/** The saved transactions, or null while the page hasn't read them yet. */
export function useTransactions(): Transaction[] | null {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
}

/** Changes the transactions and saves them. Returns whether it was saved. */
export function updateTransactions(
  change: (previous: Transaction[]) => Transaction[],
): boolean {
  return store.update(change);
}
