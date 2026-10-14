"use client";

import { useId, useState, type FormEvent } from "react";
import { CurrencySelect } from "@/components/CurrencySelect";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/components/formStyles";
import type { SaveResult } from "@/lib/accountData";
import {
  budgetProblem,
  DEFAULT_WARN_PERCENT,
  MAX_BUDGET_NAME_LENGTH,
  type Budget,
} from "@/lib/budgets";
import type { Category } from "@/lib/categories";
import { amountToInputText, currencyDecimals, parseAmount } from "@/lib/money";

type Props = {
  /** The budget being edited; leave out to add one. */
  budget?: Budget;
  /** The user's other budgets, so a second one for the same thing is caught here. */
  others: Budget[];
  categories: Category[];
  /** For a new budget: the user's main currency. */
  defaultCurrency: string;
  onSubmit: (values: Omit<Budget, "id">) => Promise<SaveResult>;
  onCancel: () => void;
};

/** The value of the "All spending" choice. */
const ALL = "";

/**
 * Adds or edits a budget: what it covers (all spending or one spending
 * category), the monthly limit and its currency, when to warn, and an
 * optional name.
 */
export function BudgetForm({ budget, others, categories, defaultCurrency, onSubmit, onCancel }: Props) {
  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? ALL);
  const [currency, setCurrency] = useState(budget?.limit.currency ?? defaultCurrency);
  const [amount, setAmount] = useState(budget ? amountToInputText(budget.limit) : "");
  const [warn, setWarn] = useState(String(budget?.warnPercent ?? DEFAULT_WARN_PERCENT));
  const [name, setName] = useState(budget?.name ?? "");
  const [error, setError] = useState<{ field: "amount" | "warn" | null; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const errorId = useId();
  const decimals = currencyDecimals(currency);

  // Spending categories only (a budget limits spending): the open ones,
  // plus this budget's own if it has been archived since.
  const choices = categories.filter(
    (c) => c.kind === "expense" && (!c.archived || c.id === budget?.categoryId),
  );

  const invalid = (field: "amount" | "warn") =>
    error?.field === field ? { "aria-invalid": true as const, "aria-describedby": errorId } : {};

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountMinor = parseAmount(amount, currency);
    if (amountMinor === null) {
      setError({
        field: "amount",
        message:
          decimals === 0
            ? `Enter a whole amount greater than zero, like 1500. ${currency} has no decimals.`
            : `Enter an amount greater than zero, like 1500 or 1500.50.`,
      });
      return;
    }
    const warnPercent = Number(warn);
    const values: Omit<Budget, "id"> = {
      ...(name.trim() && { name: name.trim() }),
      categoryId: categoryId === ALL ? null : categoryId,
      limit: { amountMinor, currency },
      warnPercent,
    };
    const problem = budgetProblem(values, others);
    if (problem) {
      setError({ field: problem.includes("warning level") ? "warn" : null, message: problem });
      return;
    }
    setError(null);
    setSaving(true);
    const result = await onSubmit(values);
    setSaving(false);
    if (!result.ok) setError({ field: null, message: result.message });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium sm:col-span-2">
          What it covers
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className={fieldClass}
          >
            <option value={ALL}>All spending</option>
            {choices.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.archived ? ", archived" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Monthly limit ({currency})
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder={decimals === 0 ? "0" : `0.${"0".repeat(decimals)}`}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={fieldClass}
            {...invalid("amount")}
          />
        </label>

        <label className="block text-sm font-medium">
          Currency
          <CurrencySelect value={currency} onChange={setCurrency} />
        </label>

        <label className="block text-sm font-medium">
          Warn me from (%)
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            step={1}
            value={warn}
            onChange={(event) => setWarn(event.target.value)}
            className={fieldClass}
            {...invalid("warn")}
          />
        </label>

        <label className="block text-sm font-medium">
          Name <span className="font-normal text-muted">(optional)</span>
          <input
            type="text"
            maxLength={MAX_BUDGET_NAME_LENGTH}
            autoComplete="off"
            placeholder="Like: Eating out"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={fieldClass}
          />
        </label>
      </div>

      {error && (
        <p id={errorId} role="alert" className="mt-4 text-sm text-danger">
          {error.message}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {budget ? "Save changes" : "Add budget"}
        </button>
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>
          Cancel
        </button>
      </div>
    </form>
  );
}
