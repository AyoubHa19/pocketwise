import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { Settings } from "@/lib/settingsStore";
import type { OpeningBalance } from "@/lib/summary";
import {
  removeTransaction,
  upsertTransaction,
  type Transaction,
} from "@/lib/transactions";
import { api } from "../../convex/_generated/api";

// The signed-in user's data, read from and saved to their account (Convex).
// The hooks keep the shapes the screens already used with localStorage:
// null while loading, and saving returns whether it worked.
//
// Changes show on screen at once ("optimistic updates"), so the list and
// its animations respond immediately. If the server refuses or can't be
// reached, Convex puts the screen back as it was, and the returned false
// lets the screen say so: a failed save never looks like it worked.

/**
 * Whether Convex has confirmed the sign-in: "loading" at first, then
 * "ready", or "unconfirmed" if it couldn't (Clerk says signed in, but the
 * server didn't accept the sign-in).
 */
export function useAccountStatus(): "loading" | "ready" | "unconfirmed" {
  const { isLoading, isAuthenticated } = useConvexAuth();
  if (isLoading) return "loading";
  return isAuthenticated ? "ready" : "unconfirmed";
}

/** The account's settings, or null while they load. */
export function useAccountSettings(): Settings | null {
  const { isAuthenticated } = useConvexAuth();
  // "skip" until the sign-in is confirmed: asking earlier would be refused.
  return useQuery(api.settings.get, isAuthenticated ? {} : "skip") ?? null;
}

/** The account's transactions, newest first, or null while they load. */
export function useAccountTransactions(): Transaction[] | null {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.transactions.list, isAuthenticated ? {} : "skip") ?? null;
}

/** Runs a save, turning success or any failure into true or false. */
async function succeeded(save: Promise<unknown>): Promise<boolean> {
  try {
    await save;
    return true;
  } catch {
    return false;
  }
}

/** Adds or updates a transaction. Resolves to whether it was saved. */
export function useSaveTransaction() {
  const save = useMutation(api.transactions.save).withOptimisticUpdate(
    (store, { transaction }) => {
      const list = store.getQuery(api.transactions.list, {});
      if (list !== undefined) {
        store.setQuery(api.transactions.list, {}, upsertTransaction(list, transaction));
      }
    },
  );
  return (transaction: Transaction) => succeeded(save({ transaction }));
}

/** Deletes a transaction. Resolves to whether it was deleted. */
export function useRemoveTransaction() {
  const remove = useMutation(api.transactions.remove).withOptimisticUpdate(
    (store, { id }) => {
      const list = store.getQuery(api.transactions.list, {});
      if (list !== undefined) {
        store.setQuery(api.transactions.list, {}, removeTransaction(list, id));
      }
    },
  );
  return (id: string) => succeeded(remove({ id }));
}

/** Saves the currency for new transactions. Resolves to whether it was saved. */
export function useSetCurrency() {
  const set = useMutation(api.settings.setCurrency).withOptimisticUpdate(
    (store, { currency }) => {
      const settings = store.getQuery(api.settings.get, {});
      if (settings !== undefined) store.setQuery(api.settings.get, {}, { ...settings, currency });
    },
  );
  return (currency: string) => succeeded(set({ currency }));
}

/** Saves the starting balance, or removes it with null. */
export function useSetOpeningBalance() {
  const set = useMutation(api.settings.setOpeningBalance).withOptimisticUpdate(
    (store, { openingBalance }) => {
      const settings = store.getQuery(api.settings.get, {});
      if (settings !== undefined) {
        store.setQuery(api.settings.get, {}, { ...settings, openingBalance });
      }
    },
  );
  return (openingBalance: OpeningBalance | null) => succeeded(set({ openingBalance }));
}
