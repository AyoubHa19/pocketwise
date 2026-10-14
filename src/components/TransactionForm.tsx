"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useId, useState, type FormEvent } from "react";
import {
  amountFieldClass,
  dangerButtonClass,
  fieldClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/formStyles";
import type { Account } from "@/lib/accounts";
import { DEFAULT_CATEGORIES, sameName, type Category } from "@/lib/categories";
import { amountToInputText, currencyDecimals, parseAmount } from "@/lib/money";
import { fadeRise } from "@/lib/motion";
import {
  newTransactionId,
  TRANSFER_CATEGORY,
  type Transaction,
  type TransactionType,
} from "@/lib/transactions";
import { useToday } from "@/lib/useToday";

type Props = {
  /** The transaction to edit. Leave it out to add a new one. */
  transaction?: Transaction;
  /** The user's accounts, archived ones too (an edited one may be in one). */
  accounts: Account[];
  /** The user's categories, archived ones too (an edited one may be in one). */
  categories: Category[];
  /** The user's main currency, for a new transaction's first account. */
  defaultCurrency: string;
  onSave: (transaction: Transaction) => void;
  /** Shown as a Cancel button next to Save. */
  onCancel?: () => void;
  /** Shown as a Delete button when editing. */
  onDelete?: () => void;
};

type Field = "amount" | "date" | "account" | "to";

/** The value of the "new Main account" choice, when the user has none yet. */
const NEW_ACCOUNT = "";

// `transaction` only fills the fields when the form first appears. To load a
// different transaction, give the form a new `key` so React starts it afresh.
export function TransactionForm({
  transaction,
  accounts,
  categories,
  defaultCurrency,
  onSave,
  onCancel,
  onDelete,
}: Props) {
  const isEditing = transaction !== undefined;
  const open = accounts.filter((a) => !a.archived);
  const byId = new Map(accounts.map((a) => [a.id, a]));
  // Accounts you can pick: the open ones, plus the transaction's own if it
  // has been archived since, so editing never silently moves it.
  const choosable = (keep?: string) =>
    accounts.filter((a) => !a.archived || a.id === keep);

  const [type, setType] = useState<TransactionType>(transaction?.type ?? "expense");
  const [accountId, setAccountId] = useState<string>(
    transaction?.accountId ??
      (open.find((a) => a.currency === defaultCurrency) ?? open[0])?.id ??
      NEW_ACCOUNT,
  );
  const account = byId.get(accountId);
  // The amount is in the account's currency: balances never mix currencies.
  // (Before any account exists, it's the main currency, for the new one.)
  const currency = account?.currency ?? transaction?.amount.currency ?? defaultCurrency;
  const decimals = currencyDecimals(currency);

  // Where a transfer can go: another account in the same currency.
  const destinations = choosable(transaction?.toAccountId).filter(
    (a) => a.currency === currency && a.id !== accountId,
  );
  const [pickedTo, setPickedTo] = useState<string | null>(transaction?.toAccountId ?? null);
  const toAccountId =
    pickedTo && destinations.some((a) => a.id === pickedTo) ? pickedTo : (destinations[0]?.id ?? null);
  // A transfer needs two accounts in one currency.
  const canTransfer = open.some((a) => open.some((b) => b.id !== a.id && b.currency === a.currency));

  // The categories you can pick for this type: the open ones, plus the
  // transaction's own if it has been archived since. Until the user's own
  // list has arrived (a first visit), the default names, which the server
  // finds by name.
  const isTransfer = type === "transfer";
  const ofKind = isTransfer
    ? []
    : categories.filter(
        (c) => c.kind === type && (!c.archived || c.id === transaction?.categoryId),
      );
  const categoryChoices: Pick<Category, "name" | "archived">[] =
    ofKind.length > 0 || isTransfer
      ? ofKind
      : DEFAULT_CATEGORIES.filter((c) => c.kind === type).map((c) => ({ ...c, archived: false }));
  // Picked by name: names are unique within a type.
  const [pickedCategory, setPickedCategory] = useState<string | null>(
    transaction && transaction.type !== "transfer" ? transaction.category : null,
  );
  const category =
    categoryChoices.find((c) => pickedCategory !== null && sameName(c.name, pickedCategory))?.name ??
    categoryChoices[0]?.name ??
    "";
  const [amount, setAmount] = useState(transaction ? amountToInputText(transaction.amount) : "");
  // null until the user picks a date themselves; until then, use today.
  const [pickedDate, setPickedDate] = useState<string | null>(transaction?.date ?? null);
  const [note, setNote] = useState(transaction?.note ?? "");
  // Which field the error is about, so that field can be marked invalid.
  const [error, setError] = useState<{ field: Field; message: string } | null>(null);
  const errorId = useId();

  const today = useToday();
  const date = pickedDate ?? today;

  const invalid = (field: Field) =>
    error?.field === field ? { "aria-invalid": true as const, "aria-describedby": errorId } : {};

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amountMinor = parseAmount(amount, currency);
    if (amountMinor === null) {
      setError({
        field: "amount",
        message:
          decimals === 0
            ? `Enter a whole amount greater than zero, like 1500. ${currency} has no decimals.`
            : `Enter an amount greater than zero, like 12.50, with up to ${decimals} decimals.`,
      });
      return;
    }
    if (!date) {
      setError({ field: "date", message: "Pick a date." });
      return;
    }
    if (isTransfer && accountId === NEW_ACCOUNT) {
      setError({ field: "account", message: "Pick the account the money left." });
      return;
    }
    if (isTransfer && !toAccountId) {
      setError({
        field: "to",
        message: `A transfer needs another ${currency} account to go to. Add one on the Accounts page.`,
      });
      return;
    }

    const categoryId = ofKind.find((c) => sameName(c.name, category))?.id;
    onSave({
      // Editing keeps the same id, so the saved one is replaced, not copied.
      id: transaction?.id ?? newTransactionId(),
      type,
      amount: { amountMinor, currency },
      category: isTransfer ? TRANSFER_CATEGORY : category,
      ...(categoryId && { categoryId }),
      date,
      note: note.trim() || undefined,
      ...(accountId !== NEW_ACCOUNT && { accountId }),
      ...(isTransfer && toAccountId && { toAccountId }),
    });
  }

  const accountOptions = (keep?: string) => {
    const list = choosable(keep);
    if (list.length === 0) {
      return <option value={NEW_ACCOUNT}>Main account (new, {defaultCurrency})</option>;
    }
    return list.map((a) => (
      <option key={a.id} value={a.id}>
        {a.name} ({a.currency}){a.archived ? ", archived" : ""}
      </option>
    ));
  };

  // The card and the title come from the Sheet this form is shown in.
  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {/* The amount comes first and largest: it's what people came to
            enter, and the sheet puts the cursor straight into it. */}
        <label className="block text-sm font-medium sm:col-span-2">
          Amount ({currency})
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            data-autofocus
            placeholder={decimals === 0 ? "0" : `0.${"0".repeat(decimals)}`}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={amountFieldClass}
            {...invalid("amount")}
          />
        </label>

        <label className="block text-sm font-medium">
          Type
          <select
            value={type}
            onChange={(event) => setType(event.target.value as TransactionType)}
            className={fieldClass}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer" disabled={!canTransfer && !isTransfer}>
              {canTransfer || isTransfer ? "Transfer" : "Transfer (needs two accounts in one currency)"}
            </option>
          </select>
        </label>

        {isTransfer ? (
          <p className="flex min-h-11 items-end pb-2 text-sm text-muted">
            Between your accounts: not income or spending.
          </p>
        ) : (
          <label className="block text-sm font-medium">
            Category
            <select
              value={category}
              onChange={(event) => setPickedCategory(event.target.value)}
              className={fieldClass}
            >
              {categoryChoices.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                  {c.archived ? ", archived" : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className={`block text-sm font-medium ${isTransfer ? "" : "sm:col-span-2"}`}>
          {isTransfer ? "From" : "Account"}
          <select
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            className={fieldClass}
            {...invalid("account")}
          >
            {accountOptions(transaction?.accountId)}
          </select>
        </label>

        {isTransfer && (
          <label className="block text-sm font-medium">
            To
            <select
              value={toAccountId ?? ""}
              onChange={(event) => setPickedTo(event.target.value)}
              disabled={destinations.length === 0}
              className={fieldClass}
              {...invalid("to")}
            >
              {destinations.length === 0 ? (
                <option value="">No other {currency} account</option>
              ) : (
                destinations.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.archived ? ", archived" : ""}
                  </option>
                ))
              )}
            </select>
          </label>
        )}

        <label className="block text-sm font-medium sm:col-span-2">
          Date
          <input
            type="date"
            value={date}
            onChange={(event) => setPickedDate(event.target.value)}
            className={fieldClass}
            {...invalid("date")}
          />
        </label>

        <label className="block text-sm font-medium sm:col-span-2">
          Note <span className="font-normal text-muted">(optional)</span>
          <input
            type="text"
            maxLength={100}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className={fieldClass}
          />
        </label>
      </div>

      {/* The message fades in. It's announced the moment it's added
          (role="alert"), so screen readers don't wait for the animation. */}
      <AnimatePresence initial={false}>
        {error && (
          <m.p
            key={error.message}
            id={errorId}
            role="alert"
            variants={fadeRise}
            initial="hidden"
            animate="shown"
            exit="hidden"
            className="mt-4 text-sm text-danger"
          >
            {error.message}
          </m.p>
        )}
      </AnimatePresence>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="submit" className={primaryButtonClass}>
          {isEditing ? "Save changes" : isTransfer ? "Add transfer" : "Add transaction"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={secondaryButtonClass}>
            Cancel
          </button>
        )}
        {isEditing && onDelete && (
          <button type="button" onClick={onDelete} className={dangerButtonClass}>
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
