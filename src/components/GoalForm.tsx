"use client";

import { useId, useState, type FormEvent } from "react";
import { CurrencySelect } from "@/components/CurrencySelect";
import { colorTransition, fieldClass, primaryButtonClass, secondaryButtonClass } from "@/components/formStyles";
import type { GoalFields, SaveResult } from "@/lib/accountData";
import type { Account } from "@/lib/accounts";
import { goalProblem, MAX_GOAL_NAME_LENGTH, type Goal } from "@/lib/goals";
import { amountToInputText, currencyDecimals, parseAmount } from "@/lib/money";

type Props = {
  /** The goal being edited; leave out to add one. */
  goal?: Goal;
  accounts: Account[];
  /** For a new goal: the user's main currency. */
  defaultCurrency: string;
  onSubmit: (fields: GoalFields, currency: string) => Promise<SaveResult>;
  onCancel: () => void;
};

const optionClass = `flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-3 hover:bg-surface-muted ${colorTransition}`;

/**
 * Adds or edits a savings goal: its name, target, optional date, and how
 * it counts what's saved (its own entries, or an account's balance). The
 * currency is chosen once, when the goal is added.
 */
export function GoalForm({ goal, accounts, defaultCurrency, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(goal?.name ?? "");
  const [currency, setCurrency] = useState(goal?.target.currency ?? defaultCurrency);
  const [amount, setAmount] = useState(goal ? amountToInputText(goal.target) : "");
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? "");
  const [follows, setFollows] = useState<"entries" | "account">(goal?.accountId ? "account" : "entries");
  const [pickedAccount, setPickedAccount] = useState(goal?.accountId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const errorId = useId();
  const decimals = currencyDecimals(currency);

  // Accounts it can follow: open ones in its currency, plus its own if
  // that one has been archived since.
  const choices = accounts.filter(
    (a) => a.currency === currency && (!a.archived || a.id === goal?.accountId),
  );
  const accountId = choices.some((a) => a.id === pickedAccount) ? pickedAccount : (choices[0]?.id ?? "");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetMinor = parseAmount(amount, currency);
    if (targetMinor === null) {
      setError(
        decimals === 0
          ? `Enter a whole target greater than zero, like 10000. ${currency} has no decimals.`
          : "Enter a target greater than zero, like 10000 or 10000.50.",
      );
      return;
    }
    if (follows === "account" && !accountId) {
      setError(`There's no ${currency} account to follow. Add one on the Accounts page, or count your own entries.`);
      return;
    }
    const fields: GoalFields = {
      name: name.trim(),
      targetMinor,
      targetDate: targetDate || null,
      accountId: follows === "account" ? accountId : null,
    };
    const problem = goalProblem({ name: fields.name, target: { amountMinor: targetMinor, currency }, targetDate: fields.targetDate });
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSaving(true);
    const result = await onSubmit(fields, currency);
    setSaving(false);
    if (!result.ok) setError(result.message);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium sm:col-span-2">
          Name
          <input
            type="text"
            maxLength={MAX_GOAL_NAME_LENGTH}
            autoComplete="off"
            placeholder="Like: Emergency fund, New laptop"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="block text-sm font-medium">
          Target ({currency})
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder={decimals === 0 ? "0" : `0.${"0".repeat(decimals)}`}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={fieldClass}
          />
        </label>

        {goal ? (
          // Its entries are in this currency, so it stays.
          <div className="text-sm font-medium">
            Currency
            <p className="mt-1 flex min-h-11 items-center font-normal text-muted">{currency}, for good</p>
          </div>
        ) : (
          <label className="block text-sm font-medium">
            Currency
            <CurrencySelect value={currency} onChange={setCurrency} />
          </label>
        )}

        <label className="block text-sm font-medium sm:col-span-2">
          Reach it by <span className="font-normal text-muted">(optional)</span>
          <input
            type="date"
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
            className={fieldClass}
          />
        </label>

        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-medium">How it counts what&apos;s saved</legend>
          <div className="mt-1 space-y-1">
            <label className={optionClass}>
              <input
                type="radio"
                name="follows"
                value="entries"
                checked={follows === "entries"}
                onChange={() => setFollows("entries")}
                className="h-4 w-4 accent-accent"
              />
              <span className="text-sm">
                My own entries{" "}
                <span className="text-muted">(note each time you put money aside)</span>
              </span>
            </label>
            <label className={optionClass}>
              <input
                type="radio"
                name="follows"
                value="account"
                checked={follows === "account"}
                onChange={() => setFollows("account")}
                className="h-4 w-4 accent-accent"
              />
              <span className="text-sm">
                An account&apos;s balance{" "}
                <span className="text-muted">(like a savings account you transfer to)</span>
              </span>
            </label>
          </div>
          {follows === "account" &&
            (choices.length > 0 ? (
              <label className="mt-2 block text-sm font-medium">
                Account
                <select
                  value={accountId}
                  onChange={(event) => setPickedAccount(event.target.value)}
                  className={fieldClass}
                >
                  {choices.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                      {a.archived ? ", archived" : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="mt-2 text-sm text-muted">
                You have no {currency} account yet. Add one on the Accounts page.
              </p>
            ))}
        </fieldset>
      </div>

      {error && (
        <p id={errorId} role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {goal ? "Save changes" : "Add goal"}
        </button>
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>
          Cancel
        </button>
      </div>
    </form>
  );
}
