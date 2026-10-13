"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import { todayISODate } from "@/lib/dates";
import {
  amountToInputText,
  CURRENCIES,
  currencyDecimals,
  parseAmount,
} from "@/lib/money";
import {
  CATEGORIES,
  newTransactionId,
  type Transaction,
  type TransactionType,
} from "@/lib/transactions";

// text-base (16px) stops phones from zooming in when a field is tapped.
const fieldClass =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-background px-3 py-2 text-base dark:border-zinc-700";

type Props = {
  /** The transaction to edit. Leave it out to add a new one. */
  transaction?: Transaction;
  onSave: (transaction: Transaction) => void;
  /** Shown as a Cancel button while editing. */
  onCancel?: () => void;
};

// Today's date, read only in the browser. The server can't know the user's
// time zone, so it renders an empty date and React fills it in right after.
function useToday(): string {
  return useSyncExternalStore(subscribeToNothing, todayISODate, () => "");
}

function subscribeToNothing() {
  return () => {};
}

// `transaction` only fills the fields when the form first appears. To load a
// different transaction, give the form a new `key` so React starts it afresh.
export function TransactionForm({ transaction, onSave, onCancel }: Props) {
  const isEditing = transaction !== undefined;

  const [type, setType] = useState<TransactionType>(
    transaction?.type ?? "expense",
  );
  const [category, setCategory] = useState<string>(
    transaction?.category ?? "Food",
  );
  const [amount, setAmount] = useState(
    transaction ? amountToInputText(transaction.amount) : "",
  );
  const [currency, setCurrency] = useState<string>(
    transaction?.amount.currency ?? "USD",
  );
  // null until the user picks a date themselves; until then, use today.
  const [pickedDate, setPickedDate] = useState<string | null>(
    transaction?.date ?? null,
  );
  const [note, setNote] = useState(transaction?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  const today = useToday();
  const date = pickedDate ?? today;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amountMinor = parseAmount(amount, currency);
    if (amountMinor === null) {
      const decimals = currencyDecimals(currency);
      setError(
        decimals === 0
          ? `Enter a whole amount greater than zero, like 1500. ${currency} has no decimals.`
          : `Enter an amount greater than zero, like 12.50, with up to ${decimals} decimals.`,
      );
      return;
    }
    if (!date) {
      setError("Pick a date.");
      return;
    }

    onSave({
      // Editing keeps the same id, so the saved one is replaced, not copied.
      id: transaction?.id ?? newTransactionId(),
      type,
      amount: { amountMinor, currency },
      category,
      date,
      note: note.trim() || undefined,
    });

    // Keep type, category, currency and date: people often add several
    // similar transactions in a row.
    setAmount("");
    setNote("");
    setError(null);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-lg border border-zinc-200 p-4 sm:p-6 dark:border-zinc-800"
    >
      <h2 className="text-lg font-semibold">
        {isEditing ? "Edit transaction" : "Add a transaction"}
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Type
          <select
            value={type}
            onChange={(event) => setType(event.target.value as TransactionType)}
            className={fieldClass}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>

        <label className="block text-sm font-medium">
          Category
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className={fieldClass}
          >
            {CATEGORIES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Amount
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={error !== null && amount !== "" ? true : undefined}
            className={fieldClass}
          />
        </label>

        <label className="block text-sm font-medium">
          Currency
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            className={fieldClass}
          >
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Date
          <input
            type="date"
            value={date}
            onChange={(event) => setPickedDate(event.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="block text-sm font-medium">
          Note <span className="font-normal text-zinc-500">(optional)</span>
          <input
            type="text"
            maxLength={100}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className={fieldClass}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          className="w-full rounded-md bg-foreground px-4 py-2.5 font-medium text-background hover:opacity-90 sm:w-auto"
        >
          {isEditing ? "Save changes" : "Add transaction"}
        </button>
        {isEditing && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-md border border-zinc-300 px-4 py-2.5 font-medium hover:bg-zinc-100 sm:w-auto dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
