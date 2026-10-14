"use client";

import { useId, useState, type FormEvent } from "react";
import { CurrencySelect } from "@/components/CurrencySelect";
import {
  fieldClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/formStyles";
import type { SaveResult } from "@/lib/accountData";
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPES,
  MAX_ACCOUNT_NAME_LENGTH,
  type Account,
  type AccountOpening,
  type AccountType,
} from "@/lib/accounts";
import { amountToInputText, currencyDecimals, parseBalance } from "@/lib/money";
import { useToday } from "@/lib/useToday";

export type AccountFormValues = {
  name: string;
  type: AccountType;
  currency: string;
  opening: AccountOpening | null;
};

type Props = {
  /** The account being edited; leave out to add one. */
  account?: Account;
  /** For a new account: the user's main currency, chosen to start with. */
  defaultCurrency: string;
  onSubmit: (values: AccountFormValues) => Promise<SaveResult>;
  onCancel: () => void;
};

type Field = "name" | "amount" | "date";

/**
 * Adds or edits an account. The starting balance is optional: left empty,
 * the account has none, and Pocketwise shows no balance for it rather than
 * a guessed one. A currency is chosen once, when the account is added.
 */
export function AccountForm({ account, defaultCurrency, onSubmit, onCancel }: Props) {
  const today = useToday();
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<AccountType>(account?.type ?? "bank");
  const [currency, setCurrency] = useState(account?.currency ?? defaultCurrency);
  const [amount, setAmount] = useState(
    account?.opening ? amountToInputText({ amountMinor: account.opening.amountMinor, currency: account.currency }) : "",
  );
  const [date, setDate] = useState(account?.opening?.date ?? today);
  const [error, setError] = useState<{ field: Field | null; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const errorId = useId();

  const invalid = (field: Field) =>
    error?.field === field ? { "aria-invalid": true, "aria-describedby": errorId } : {};

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError({ field: "name", message: "Give the account a name." });
      return;
    }
    let opening: AccountOpening | null = null;
    if (amount.trim() !== "") {
      const amountMinor = parseBalance(amount, currency);
      if (amountMinor === null) {
        const decimals = currencyDecimals(currency);
        setError({
          field: "amount",
          message: `Enter an amount like ${decimals === 0 ? "3000" : "3000.00"}, with a minus for an overdraft, or leave it empty.`,
        });
        return;
      }
      if (!date) {
        setError({ field: "date", message: "Pick the day this balance was true." });
        return;
      }
      opening = { amountMinor, date };
    }
    setError(null);
    setSaving(true);
    const result = await onSubmit({ name, type, currency, opening });
    setSaving(false);
    if (!result.ok) setError({ field: null, message: result.message });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-medium sm:col-span-2">
        Name
        <input
          type="text"
          value={name}
          maxLength={MAX_ACCOUNT_NAME_LENGTH}
          autoComplete="off"
          placeholder="e.g. Cash, CIH Bank, Wallet"
          onChange={(event) => setName(event.target.value)}
          className={fieldClass}
          {...invalid("name")}
        />
      </label>

      <label className="block text-sm font-medium">
        Type
        <select
          value={type}
          onChange={(event) => setType(event.target.value as AccountType)}
          className={fieldClass}
        >
          {ACCOUNT_TYPES.map((value) => (
            <option key={value} value={value}>
              {ACCOUNT_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
      </label>

      {account ? (
        <div className="text-sm font-medium">
          Currency
          <p className="mt-1 flex min-h-11 items-center text-muted">
            {account.currency} (can&apos;t change once the account exists)
          </p>
        </div>
      ) : (
        <label className="block text-sm font-medium">
          Currency
          <CurrencySelect value={currency} onChange={setCurrency} />
        </label>
      )}

      <label className="block text-sm font-medium">
        Starting balance ({currency}) <span className="font-normal text-muted">(optional)</span>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder={currencyDecimals(currency) === 0 ? "0" : "0.00"}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className={fieldClass}
          {...invalid("amount")}
        />
      </label>

      <label className="block text-sm font-medium">
        At the start of
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className={fieldClass}
          {...invalid("date")}
        />
      </label>

      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger sm:col-span-2">
          {error.message}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row">
        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {saving ? "Saving…" : account ? "Save changes" : "Add account"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className={secondaryButtonClass}>
          Cancel
        </button>
      </div>
    </form>
  );
}
