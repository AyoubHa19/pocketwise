import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import type { Account, AccountOpening, AccountType } from "@/lib/accounts";
import type { Budget } from "@/lib/budgets";
import type { Category, CategoryKind } from "@/lib/categories";
import type { Preferences } from "@/lib/preferences";
import type { Settings } from "@/lib/settingsStore";
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

/** The user's money accounts (archived ones too), or null while they load. */
export function useAccounts(): Account[] | null {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.accounts.list, isAuthenticated ? {} : "skip") ?? null;
}

export type SaveResult = { ok: true } | { ok: false; message: string };

/**
 * Runs a save and says how it went, with the server's own words when it
 * refused (like "Give the account a name."), or a general message when it
 * couldn't be reached.
 */
async function withMessage(save: Promise<unknown>): Promise<SaveResult> {
  try {
    await save;
    return { ok: true };
  } catch (error) {
    if (error instanceof ConvexError && typeof error.data === "string") {
      return { ok: false, message: error.data };
    }
    return {
      ok: false,
      message: "Pocketwise couldn't save this to your account. Check your connection and try again.",
    };
  }
}

type AccountFields = { name: string; type: AccountType; opening: AccountOpening | null };

/** Adds an account. */
export function useCreateAccount() {
  const create = useMutation(api.accounts.create);
  // Named fields only, for the same reason as useUpdateAccount.
  return ({ name, type, currency, opening }: AccountFields & { currency: string }) =>
    withMessage(create({ name, type, currency, opening }));
}

/** Changes an account's name, type and starting balance. */
export function useUpdateAccount() {
  const update = useMutation(api.accounts.update).withOptimisticUpdate((store, change) => {
    const list = store.getQuery(api.accounts.list, {});
    if (list === undefined) return;
    store.setQuery(
      api.accounts.list,
      {},
      list.map((a) =>
        a.id === change.id ? { ...a, name: change.name.trim(), type: change.type, opening: change.opening } : a,
      ),
    );
  });
  // Only the fields update accepts: Convex refuses any extra (like a
  // currency, which can't change), and a form may hand over more.
  return (id: string, { name, type, opening }: AccountFields) =>
    withMessage(update({ id, name, type, opening }));
}

/** Archives an account, or brings it back. */
export function useSetAccountArchived() {
  const set = useMutation(api.accounts.setArchived).withOptimisticUpdate((store, { id, archived }) => {
    const list = store.getQuery(api.accounts.list, {});
    if (list !== undefined) {
      store.setQuery(api.accounts.list, {}, list.map((a) => (a.id === id ? { ...a, archived } : a)));
    }
  });
  return (id: string, archived: boolean) => withMessage(set({ id, archived }));
}

/** Deletes an account that has never been used. */
export function useRemoveAccount() {
  const remove = useMutation(api.accounts.remove);
  return (id: string) => withMessage(remove({ id }));
}

/** The user's categories (archived ones too), oldest first, or null while they load. */
export function useCategories(): Category[] | null {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.categories.list, isAuthenticated ? {} : "skip") ?? null;
}

/** Adds a category. */
export function useCreateCategory() {
  const create = useMutation(api.categories.create);
  return (name: string, kind: CategoryKind) => withMessage(create({ name, kind }));
}

/** Renames a category, and every transaction in it shows the new name at once. */
export function useRenameCategory() {
  const rename = useMutation(api.categories.rename).withOptimisticUpdate((store, { id, name }) => {
    const trimmed = name.trim();
    const list = store.getQuery(api.categories.list, {});
    if (list !== undefined) {
      store.setQuery(api.categories.list, {}, list.map((c) => (c.id === id ? { ...c, name: trimmed } : c)));
    }
    const transactions = store.getQuery(api.transactions.list, {});
    if (transactions !== undefined) {
      store.setQuery(
        api.transactions.list,
        {},
        transactions.map((t) => (t.categoryId === id ? { ...t, category: trimmed } : t)),
      );
    }
  });
  return (id: string, name: string) => withMessage(rename({ id, name }));
}

/** Archives a category, or brings it back. */
export function useSetCategoryArchived() {
  const set = useMutation(api.categories.setArchived).withOptimisticUpdate((store, { id, archived }) => {
    const list = store.getQuery(api.categories.list, {});
    if (list !== undefined) {
      store.setQuery(api.categories.list, {}, list.map((c) => (c.id === id ? { ...c, archived } : c)));
    }
  });
  return (id: string, archived: boolean) => withMessage(set({ id, archived }));
}

/** The user's budgets, oldest first, or null while they load. */
export function useBudgets(): Budget[] | null {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.budgets.list, isAuthenticated ? {} : "skip") ?? null;
}

/** The fields the budget functions take: named, since Convex refuses extras. */
function budgetArgs({ name, categoryId, limit, warnPercent }: Omit<Budget, "id">) {
  return {
    ...(name !== undefined && { name }),
    categoryId,
    limitMinor: limit.amountMinor,
    currency: limit.currency,
    warnPercent,
  };
}

/** Adds a budget. */
export function useCreateBudget() {
  const create = useMutation(api.budgets.create);
  return (values: Omit<Budget, "id">) => withMessage(create(budgetArgs(values)));
}

/** Changes a budget. */
export function useUpdateBudget() {
  const update = useMutation(api.budgets.update).withOptimisticUpdate((store, change) => {
    const list = store.getQuery(api.budgets.list, {});
    if (list === undefined) return;
    store.setQuery(
      api.budgets.list,
      {},
      list.map((b) =>
        b.id === change.id
          ? {
              id: b.id,
              ...(change.name?.trim() && { name: change.name.trim() }),
              categoryId: change.categoryId,
              limit: { amountMinor: change.limitMinor, currency: change.currency },
              warnPercent: change.warnPercent,
            }
          : b,
      ),
    );
  });
  return (id: string, values: Omit<Budget, "id">) => withMessage(update({ id, ...budgetArgs(values) }));
}

/** Deletes a budget. */
export function useRemoveBudget() {
  const remove = useMutation(api.budgets.remove).withOptimisticUpdate((store, { id }) => {
    const list = store.getQuery(api.budgets.list, {});
    if (list !== undefined) store.setQuery(api.budgets.list, {}, list.filter((b) => b.id !== id));
  });
  return (id: string) => withMessage(remove({ id }));
}

/** The account's display preferences, or null while they load. */
export function useAccountPreferences(): Preferences | null {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.preferences.get, isAuthenticated ? {} : "skip") ?? null;
}

/** Saves one or both preferences. Resolves to whether they were saved. */
export function useSetPreferences() {
  const set = useMutation(api.preferences.set).withOptimisticUpdate((store, change) => {
    const current = store.getQuery(api.preferences.get, {});
    if (current !== undefined) store.setQuery(api.preferences.get, {}, { ...current, ...change });
  });
  return (change: Partial<Preferences>) => succeeded(set(change));
}

