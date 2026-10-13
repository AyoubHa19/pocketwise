"use client";

import { useState, type FormEvent } from "react";
import {
  fieldClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/formStyles";
import { amountToInputText, currencyDecimals, parseAmount } from "@/lib/money";
import {
  CATEGORIES,
  newTransactionId,
  type Transaction,
  type TransactionType,
} from "@/lib/transactions";
import { useToday } from "@/lib/useToday";

type Props = {
  /** The transaction to edit. Leave it out to add a new one. */
  transaction?: Transaction;
  /** The currency for new transactions, from the settings. */
  defaultCurrency: string;
  onSave: (transaction: Transaction) => void;
  /** Shown as a Cancel button while editing. */
  onCancel?: () => void;
};

// `transaction` only fills the fields when the form first appears. To load a
// different transaction, give the form a new `key` so React starts it afresh.
export function TransactionForm({
  transaction,
  defaultCurrency,
  onSave,
  onCancel,
}: Props) {
  const isEditing = transaction !== undefined;
  // An edited transaction keeps its own currency, even if the setting has
  // changed since, because there's no exchange rate to convert it with.
  const currency = transaction?.amount.currency ?? defaultCurrency;
  const decimals = currencyDecimals(currency);

  const [type, setType] = useState<TransactionType>(
    transaction?.type ?? "expense",
  );
  const [category, setCategory] = useState<string>(
    transaction?.category ?? "Food",
  );
  const [amount, setAmount] = useState(
    transaction ? amountToInputText(transaction.amount) : "",
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

    // Keep type, category and date: people often add several
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
          Amount ({currency})
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder={decimals === 0 ? "0" : `0.${"0".repeat(decimals)}`}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={error !== null && amount !== "" ? true : undefined}
            className={fieldClass}
          />
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

        <label className="block text-sm font-medium sm:col-span-2">
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
        <button type="submit" className={primaryButtonClass}>
          {isEditing ? "Save changes" : "Add transaction"}
        </button>
        {isEditing && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={secondaryButtonClass}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
