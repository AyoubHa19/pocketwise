"use client";

import { useRef, useState } from "react";
import { CurrencySetup } from "@/components/CurrencySetup";
import { MonthPicker } from "@/components/MonthPicker";
import { MonthSummary } from "@/components/MonthSummary";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { formatMonth, monthOf } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { useSettings } from "@/lib/settingsStore";
import { totalsByCurrency, transactionsInMonth } from "@/lib/summary";
import { updateTransactions, useTransactions } from "@/lib/transactionStore";
import {
  removeTransaction,
  signedAmount,
  upsertTransaction,
  type Transaction,
} from "@/lib/transactions";
import { useToday } from "@/lib/useToday";

export function TransactionTracker() {
  const settings = useSettings();
  const transactions = useTransactions();
  const today = useToday();
  // null until the user moves to another month; until then, this month.
  const [pickedMonth, setPickedMonth] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const currentMonth = monthOf(today);
  const month = pickedMonth ?? currentMonth;

  // Looked up by id, so if the transaction disappears (say, deleted in
  // another tab), the form simply goes back to adding.
  const editing = transactions?.find((t) => t.id === editingId);

  function save(transaction: Transaction) {
    const saved = updateTransactions((previous) =>
      upsertTransaction(previous, transaction),
    );
    setSaveFailed(!saved);
    setEditingId(null);
    // Show the month the transaction is in, or it would seem to vanish when
    // its date is in a different month from the one on screen.
    setPickedMonth(monthOf(transaction.date));
  }

  function startEditing(transaction: Transaction) {
    setEditingId(transaction.id);
    // On phones the form is far above the list, so bring it into view.
    formRef.current?.scrollIntoView({ block: "start" });
  }

  function remove(transaction: Transaction) {
    const amount = formatMoney(signedAmount(transaction));
    const confirmed = window.confirm(
      `Delete ${transaction.category}, ${amount} on ${transaction.date}? This can't be undone.`,
    );
    if (!confirmed) return;

    const saved = updateTransactions((previous) =>
      removeTransaction(previous, transaction.id),
    );
    setSaveFailed(!saved);
    if (transaction.id === editingId) setEditingId(null);
  }

  // Both come from the browser's storage, so they're null while the server
  // renders the page and for a moment after it opens.
  if (settings === null || transactions === null) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }
  if (settings.currency === null) {
    return <CurrencySetup />;
  }

  const monthTransactions = transactionsInMonth(transactions, month);
  const monthName = formatMonth(month);

  return (
    <div className="space-y-10">
      <section aria-label={`Summary for ${monthName}`} className="space-y-4">
        <MonthPicker
          month={month}
          currentMonth={currentMonth}
          onChange={setPickedMonth}
        />
        <MonthSummary
          totals={totalsByCurrency(monthTransactions, settings.currency)}
        />
      </section>

      <div ref={formRef} className="scroll-mt-4">
        {/* A new key makes React start a fresh form with the new values. */}
        <TransactionForm
          key={editing?.id ?? "new"}
          transaction={editing}
          defaultCurrency={settings.currency}
          onSave={save}
          onCancel={() => setEditingId(null)}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold">Transactions in {monthName}</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Saved in this browser on this device only. Clearing your browser
          data deletes them.
        </p>

        {saveFailed && (
          <p
            role="alert"
            className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            Your browser didn&apos;t let Pocketwise save. Your latest changes
            will be lost when you close this page. Storage may be full, or
            blocked by private browsing or privacy settings.
          </p>
        )}

        <div className="mt-4">
          <TransactionList
            transactions={monthTransactions}
            emptyMessage={
              transactions.length === 0
                ? "No transactions yet. Add your first one with the form above."
                : `No transactions in ${monthName}.`
            }
            editingId={editingId}
            onEdit={startEditing}
            onDelete={remove}
          />
        </div>
      </div>
    </div>
  );
}
