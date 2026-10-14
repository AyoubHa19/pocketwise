"use client";

import { useEffect, useState } from "react";
import { AccountForm } from "@/components/AccountForm";
import {
  cardClass,
  dangerButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/formStyles";
import { Toast, type Notice } from "@/components/Toast";
import {
  useAccountPreferences,
  useAccounts,
  useAccountSettings,
  useAccountTransactions,
  useCreateAccount,
  useRemoveAccount,
  useSetAccountArchived,
  useUpdateAccount,
} from "@/lib/accountData";
import { ACCOUNT_TYPE_LABELS, type Account } from "@/lib/accounts";
import { formatMoney } from "@/lib/money";
import { DEFAULT_PREFERENCES, formatDay } from "@/lib/preferences";
import { accountBalances } from "@/lib/summary";
import { useToday } from "@/lib/useToday";

/**
 * The Accounts page: each account with its balance, to add, edit, archive
 * or delete. Delete is offered only for an account nothing was ever
 * recorded in; one with history can be archived, which keeps it all.
 */
export function AccountsManager() {
  const accounts = useAccounts();
  const transactions = useAccountTransactions();
  const settings = useAccountSettings();
  const preferences = useAccountPreferences();
  const today = useToday();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const setArchived = useSetAccountArchived();
  const removeAccount = useRemoveAccount();

  // Which form is open: adding, or editing one account.
  const [editing, setEditing] = useState<"new" | string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A confirmation stays for 4 seconds, like on the dashboard.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (accounts === null || transactions === null || settings === null) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  const balances = accountBalances(accounts, transactions, today);
  const used = (id: string) => transactions.some((t) => t.accountId === id || t.toAccountId === id);
  const open = accounts.filter((a) => !a.archived);
  const archived = accounts.filter((a) => a.archived);
  const dateOrder = preferences?.dateOrder ?? DEFAULT_PREFERENCES.dateOrder;

  function say(text: string) {
    setError(null);
    // A new id each time, so the same message twice still shows again.
    setNotice((previous) => ({ id: (previous?.id ?? 0) + 1, text }));
  }

  async function act(run: Promise<{ ok: boolean; message?: string }>, done: string) {
    const result = await run;
    if (result.ok) say(done);
    else setError(result.message ?? "That didn't work.");
  }

  function confirmDelete(account: Account) {
    if (!window.confirm(`Delete ${account.name}? It has no transactions, so nothing else is lost.`)) return;
    void act(removeAccount(account.id), `${account.name} deleted`);
  }

  function row(account: Account) {
    const balance = balances.get(account.id);
    if (editing === account.id) {
      return (
        <li key={account.id} className={`${cardClass} p-4 sm:p-6`}>
          <h3 className="mb-4 font-semibold">Edit {account.name}</h3>
          <AccountForm
            account={account}
            defaultCurrency={account.currency}
            onCancel={() => setEditing(null)}
            onSubmit={async (values) => {
              const result = await updateAccount(account.id, values);
              if (result.ok) {
                setEditing(null);
                say("Changes saved");
              }
              return result;
            }}
          />
        </li>
      );
    }
    return (
      <li key={account.id} className={`${cardClass} p-4 sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{account.name}</h3>
            <p className="text-sm text-muted">
              {ACCOUNT_TYPE_LABELS[account.type]} · {account.currency}
              {account.archived && " · Archived"}
            </p>
          </div>
          <p className={`text-lg font-semibold tabular-nums ${typeof balance === "number" && balance < 0 ? "text-danger" : ""}`}>
            {balance === null || balance === undefined
              ? "—"
              : formatMoney({ amountMinor: balance, currency: account.currency })}
          </p>
        </div>
        <p className="mt-2 text-sm text-muted">
          {account.opening
            ? `Started with ${formatMoney({ amountMinor: account.opening.amountMinor, currency: account.currency })} · ${formatDay(account.opening.date, today, dateOrder)}`
            : "No starting balance yet, so no balance is shown. Add one with Edit."}
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => setEditing(account.id)} className={secondaryButtonClass}>
            Edit
          </button>
          <button
            type="button"
            onClick={() =>
              void act(setArchived(account.id, !account.archived), account.archived ? `${account.name} brought back` : `${account.name} archived`)
            }
            className={secondaryButtonClass}
          >
            {account.archived ? "Bring back" : "Archive"}
          </button>
          {!used(account.id) && (
            <button type="button" onClick={() => confirmDelete(account)} className={dangerButtonClass}>
              Delete
            </button>
          )}
        </div>
      </li>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-prose text-sm text-muted">
          Each account keeps its own balance: its starting balance plus what
          happens in it. Moving money between your accounts will come with
          transfers, which are never counted as income or spending.
        </p>
        {editing !== "new" && (
          <button type="button" onClick={() => setEditing("new")} className={primaryButtonClass}>
            <span aria-hidden="true" className="mr-1.5 text-lg leading-none">+</span>
            Add account
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-control border border-danger-line bg-danger-surface px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {editing === "new" && (
        <section aria-labelledby="new-account-heading" className={`${cardClass} mt-6 p-4 sm:p-6`}>
          <h2 id="new-account-heading" className="mb-4 font-semibold">New account</h2>
          <AccountForm
            defaultCurrency={settings.currency ?? ""}
            onCancel={() => setEditing(null)}
            onSubmit={async (values) => {
              const result = await createAccount(values);
              if (result.ok) {
                setEditing(null);
                say(`${values.name.trim()} added`);
              }
              return result;
            }}
          />
        </section>
      )}

      {open.length === 0 && editing !== "new" ? (
        <p className="mt-6 text-sm text-muted">
          No accounts yet. Add one, or just add a transaction: Pocketwise
          makes a Main account for its currency.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 lg:grid-cols-2">{open.map(row)}</ul>
      )}

      {archived.length > 0 && (
        <section aria-labelledby="archived-heading" className="mt-10">
          <h2 id="archived-heading" className="text-lg font-semibold">Archived</h2>
          <p className="mt-1 text-sm text-muted">
            Hidden from your choices and your total; their history stays.
          </p>
          <ul className="mt-4 grid gap-4 lg:grid-cols-2">{archived.map(row)}</ul>
        </section>
      )}

      <Toast notice={notice} />
    </>
  );
}
