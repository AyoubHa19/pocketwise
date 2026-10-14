"use client";

import { useState, type FormEvent } from "react";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/components/formStyles";
import type { RuleFields, SaveResult } from "@/lib/accountData";
import type { Account } from "@/lib/accounts";
import type { Category } from "@/lib/categories";
import { amountToInputText, currencyDecimals, parseAmount } from "@/lib/money";
import {
  DEFAULT_REMIND_DAYS,
  FREQUENCIES,
  FREQUENCY_LABELS,
  MAX_REMIND_DAYS,
  MAX_RULE_NAME_LENGTH,
  ruleProblem,
  type Frequency,
  type RecurringRule,
} from "@/lib/recurring";
import { useToday } from "@/lib/useToday";

type Props = {
  /** The rule being edited; leave out to add one. */
  rule?: RecurringRule;
  accounts: Account[];
  categories: Category[];
  /** The user's main currency, when there's no account yet. */
  defaultCurrency: string;
  onSubmit: (fields: RuleFields) => Promise<SaveResult>;
  onCancel: () => void;
};

/**
 * Adds or edits a recurring item: what it is, how much, from or into which
 * account, how often, from when (and until when), and how many days ahead
 * to show it as coming up.
 */
export function RuleForm({ rule, accounts, categories, defaultCurrency, onSubmit, onCancel }: Props) {
  const today = useToday();
  const [name, setName] = useState(rule?.name ?? "");
  const [type, setType] = useState<"income" | "expense">(rule?.type ?? "expense");
  const open = accounts.filter((a) => !a.archived || a.id === rule?.accountId);
  const [accountId, setAccountId] = useState<string>(
    rule?.accountId ?? (open.find((a) => a.currency === defaultCurrency) ?? open[0])?.id ?? "",
  );
  const currency = accounts.find((a) => a.id === accountId)?.currency ?? rule?.amount.currency ?? defaultCurrency;
  const decimals = currencyDecimals(currency);
  const [amount, setAmount] = useState(rule ? amountToInputText(rule.amount) : "");
  const choices = categories.filter((c) => c.kind === type && (!c.archived || c.id === rule?.categoryId));
  const [pickedCategory, setPickedCategory] = useState(rule?.categoryId ?? "");
  const categoryId = choices.some((c) => c.id === pickedCategory) ? pickedCategory : (choices[0]?.id ?? "");
  const [frequency, setFrequency] = useState<Frequency>(rule?.frequency ?? "monthly");
  const [startDate, setStartDate] = useState(rule?.startDate ?? today);
  const [endDate, setEndDate] = useState(rule?.endDate ?? "");
  const [remind, setRemind] = useState(String(rule?.remindDays ?? DEFAULT_REMIND_DAYS));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountMinor = parseAmount(amount, currency);
    if (amountMinor === null) {
      setError(
        decimals === 0
          ? `Enter a whole amount greater than zero. ${currency} has no decimals.`
          : "Enter an amount greater than zero, like 120 or 120.50.",
      );
      return;
    }
    if (!categoryId) {
      setError("Pick a category.");
      return;
    }
    const fields: RuleFields = {
      name: name.trim(),
      type,
      amount: { amountMinor, currency },
      categoryId,
      accountId: accountId || null,
      frequency,
      startDate,
      endDate: endDate || null,
      remindDays: Number(remind),
    };
    const problem = ruleProblem(fields);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSaving(true);
    const result = await onSubmit(fields);
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
            maxLength={MAX_RULE_NAME_LENGTH}
            autoComplete="off"
            placeholder="Like: Rent, Phone bill, Salary"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="block text-sm font-medium">
          Type
          <select
            value={type}
            onChange={(event) => setType(event.target.value as "income" | "expense")}
            className={fieldClass}
          >
            <option value="expense">Expense (a bill)</option>
            <option value="income">Income</option>
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
            className={fieldClass}
          />
        </label>

        <label className="block text-sm font-medium">
          Category
          <select value={categoryId} onChange={(event) => setPickedCategory(event.target.value)} className={fieldClass}>
            {choices.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.archived ? ", archived" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Account
          <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className={fieldClass}>
            {open.length === 0 && <option value="">Main account (new, {defaultCurrency})</option>}
            {open.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency}){a.archived ? ", archived" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          How often
          <select
            value={frequency}
            onChange={(event) => setFrequency(event.target.value as Frequency)}
            className={fieldClass}
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {FREQUENCY_LABELS[f]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Remind me (days before)
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_REMIND_DAYS}
            step={1}
            value={remind}
            onChange={(event) => setRemind(event.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="block text-sm font-medium">
          First due
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={fieldClass} />
        </label>

        <label className="block text-sm font-medium">
          Ends <span className="font-normal text-muted">(optional)</span>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(event) => setEndDate(event.target.value)}
            className={fieldClass}
          />
        </label>
      </div>

      <p className="mt-4 text-sm text-muted">
        Each time it&apos;s due, Pocketwise lists it for you to record or
        skip; it never adds anything by itself. Dates before today aren&apos;t
        listed: add those as ordinary transactions if you need them.
      </p>

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {rule ? "Save changes" : "Add recurring item"}
        </button>
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>
          Cancel
        </button>
      </div>
    </form>
  );
}
