"use client";

import { useState } from "react";
import { AddTransactionForm } from "@/components/AddTransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { updateTransactions, useTransactions } from "@/lib/transactionStore";
import type { Transaction } from "@/lib/transactions";

export function TransactionTracker() {
  const transactions = useTransactions();
  const [saveFailed, setSaveFailed] = useState(false);

  function addTransaction(transaction: Transaction) {
    const saved = updateTransactions((previous) => [transaction, ...previous]);
    setSaveFailed(!saved);
  }

  return (
    <div className="mt-10 space-y-10">
      <AddTransactionForm onAdd={addTransaction} />

      <div>
        <h2 className="text-lg font-semibold">Transactions</h2>
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
          {transactions === null ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : (
            <TransactionList transactions={transactions} />
          )}
        </div>
      </div>
    </div>
  );
}
