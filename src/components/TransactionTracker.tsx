"use client";

import { useState } from "react";
import { AddTransactionForm } from "@/components/AddTransactionForm";
import { TransactionList } from "@/components/TransactionList";
import type { Transaction } from "@/lib/transactions";

export function TransactionTracker() {
  // Kept in memory only for now, so reloading the page clears the list.
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  function addTransaction(transaction: Transaction) {
    setTransactions((previous) => [transaction, ...previous]);
  }

  return (
    <div className="mt-10 space-y-10">
      <AddTransactionForm onAdd={addTransaction} />

      <div>
        <h2 className="text-lg font-semibold">Transactions</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Not saved yet: reloading the page clears this list.
        </p>
        <div className="mt-4">
          <TransactionList transactions={transactions} />
        </div>
      </div>
    </div>
  );
}
