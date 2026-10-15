"use client";

import { Landmark } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CurrencySelect } from "@/components/CurrencySelect";
import {
  cardClass,
  dangerButtonClass,
  fieldClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/formStyles";
import { ShortList } from "@/components/ShowMore";
import { Sheet } from "@/components/Sheet";
import { Toast, type Notice } from "@/components/Toast";
import { TransactionForm } from "@/components/TransactionForm";
import { useTransactionEditor } from "@/components/useTransactionEditor";
import {
  useAccountPreferences,
  useAccounts,
  useAccountSettings,
  useAccountTransactions,
  useCategories,
  useCreateDebt,
  useDebts,
  useRecurringRules,
  useRemoveDebt,
  useSetDebtArchived,
  useUpdateDebt,
  type DebtFields,
  type SaveResult,
} from "@/lib/accountData";
import {
  debtPaymentId,
  debtProblem,
  debtStatus,
  MAX_DEBT_NAME_LENGTH,
  payoff,
  type Debt,
} from "@/lib/debts";
import { amountToInputText, currencyDecimals, formatMoney, parseAmount } from "@/lib/money";
import { DEFAULT_PREFERENCES, formatDay } from "@/lib/preferences";
import { FREQUENCIES, FREQUENCY_LABELS, type Frequency, type RecurringRule } from "@/lib/recurring";
import { newTransactionId, type Transaction } from "@/lib/transactions";
import { useToday } from "@/lib/useToday";

const EVERY: Record<Frequency, string> = {
  weekly: "a week",
  biweekly: "every 2 weeks",
  monthly: "a month",
  quarterly: "every 3 months",
  yearly: "a year",
};

/** "today" and "yesterday" read as they are; a date takes "on". */
const sinceDay = (day: string) => (day === "Today" || day === "Yesterday" ? day.toLowerCase() : day);
const enteredOn = (day: string) => (sinceDay(day) === day ? `on ${day}` : sinceDay(day));

/**
 * The Debts page (PRD 18): each debt with what's left (an estimate, said
 * so), the installment, the rate if known, and when it would be paid off;
 * recording a payment opens the usual form, as a "Debt Payments" expense,
 * which counts once as spending and brings the debt down.
 */
export function DebtsManager() {
  const debts = useDebts();
  const transactions = useAccountTransactions();
  const accounts = useAccounts();
  const categories = useCategories();
  const rules = useRecurringRules();
  const settings = useAccountSettings();
  const preferences = useAccountPreferences();
  const createDebt = useCreateDebt();
  const updateDebt = useUpdateDebt();
  const setArchived = useSetDebtArchived();
  const removeDebt = useRemoveDebt();
  const editor = useTransactionEditor(transactions);
  const today = useToday();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [open, setOpen] = useState<"new" | string | null>(null);
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<Notice | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (
    debts === null ||
    transactions === null ||
    accounts === null ||
    categories === null ||
    rules === null ||
    settings === null ||
    preferences === null
  ) {
    return <p className="text-sm text-muted">Loading…</p>;
  }
  const main = settings.currency ?? "";
  const dateOrder = preferences.dateOrder ?? DEFAULT_PREFERENCES.dateOrder;
  const day = (date: string) => formatDay(date, today, dateOrder);
  const debtCategory = categories.find((c) => c.kind === "expense" && c.name === "Debt Payments" && !c.archived);

  function say(text: string) {
    setError(null);
    setNotice((p) => ({ id: (p?.id ?? 0) + 1, text }));
  }

  async function submit(run: Promise<SaveResult>, done: string): Promise<SaveResult> {
    const result = await run;
    if (result.ok) {
      setOpen(null);
      say(done);
    }
    return result;
  }

  async function act(run: Promise<SaveResult>, done: string) {
    const result = await run;
    if (result.ok) say(done);
    else setError(result.message);
  }

  /** A payment of the installment, today, from an account in the debt's currency. */
  function recordPayment(debt: Debt) {
    const account =
      accounts!.find((a) => !a.archived && a.currency === debt.currency && a.currency === main) ??
      accounts!.find((a) => !a.archived && a.currency === debt.currency);
    const draft: Transaction = {
      id: debtPaymentId(debt.id, newTransactionId()),
      type: "expense",
      amount: { amountMinor: debt.paymentMinor, currency: debt.currency },
      category: debtCategory?.name ?? "Debt Payments",
      ...(debtCategory && { categoryId: debtCategory.id }),
      date: today,
      description: debt.name,
      ...(account && { accountId: account.id }),
    };
    editor.openPrefilled(draft);
  }

  function card(debt: Debt) {
    const money = (amountMinor: number) => formatMoney({ amountMinor, currency: debt.currency });
    if (open === debt.id) {
      return (
        <li key={debt.id} className={`${cardClass} p-4 sm:p-6`}>
          <h3 className="mb-4 font-semibold">Update {debt.name}</h3>
          <DebtForm
            debt={debt}
            rules={rules!}
            defaultCurrency={debt.currency}
            today={today}
            onCancel={() => setOpen(null)}
            onSubmit={(fields) => submit(updateDebt(debt.id, fields, today), "Changes saved")}
          />
        </li>
      );
    }
    const status = debtStatus(debt, transactions!);
    const plan = payoff(debt, status.remainingMinor);
    const rule = debt.ruleId ? rules!.find((r) => r.id === debt.ruleId) : undefined;
    const paidOfOriginal =
      debt.originalMinor !== null && debt.originalMinor > 0
        ? Math.min(Math.max(Math.round(((debt.originalMinor - status.remainingMinor) * 100) / debt.originalMinor), 0), 100)
        : null;
    return (
      <li key={debt.id} className={`${cardClass} p-4 sm:p-6`}>
        <div className="flex gap-3">
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted">
            <Landmark size={20} strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="min-w-0 break-words font-semibold">{debt.name}</h3>
              <p className={`shrink-0 text-sm font-medium ${status.paidOff ? "text-positive" : "text-muted"}`}>
                {status.paidOff ? "Paid off" : "Estimated left"}
              </p>
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{money(status.remainingMinor)}</p>
            <p className="mt-0.5 text-xs text-muted">
              You entered {money(debt.balanceMinor)} {enteredOn(day(debt.balanceDate))}
              {status.payments.length > 0 &&
                `; ${money(status.paidSinceMinor)} paid since (${status.payments.length} ${status.payments.length === 1 ? "payment" : "payments"})`}
              . Interest since then isn&apos;t included: update the balance from your statement to stay exact.
            </p>
            {paidOfOriginal !== null && (
              <div
                role="meter"
                aria-label={`${debt.name} repaid`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={paidOfOriginal}
                aria-valuetext={`About ${paidOfOriginal}% of ${money(debt.originalMinor!)} repaid`}
                className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted"
              >
                <div className="h-full rounded-full bg-accent" style={{ width: `${paidOfOriginal}%` }} />
              </div>
            )}
            <ul className="mt-3 space-y-0.5 text-sm">
              <li>
                {money(debt.paymentMinor)} {EVERY[debt.frequency]}
                {debt.nextDue && ` · next ${day(debt.nextDue)}`}
                {rule && ` · paid through ${rule.name}`}
              </li>
              <li className="text-muted">
                {debt.annualRate !== null ? `${debt.annualRate}% interest a year (as you entered)` : "Interest rate not known"}
              </li>
              {!status.paidOff && (
                <li>
                  {plan.kind === "never"
                    ? "At this installment the debt never goes down: it doesn't cover the interest."
                    : plan.kind === "too-long"
                      ? "At this installment it would take over 100 years."
                      : `About ${plan.payments} more ${plan.payments === 1 ? "payment" : "payments"}${plan.lastDate ? `, the last around ${day(plan.lastDate)}` : ""}${
                          plan.interestMinor === null
                            ? ". Interest not included: add the rate to see it."
                            : `, with about ${money(plan.interestMinor)} in interest (${money(plan.totalMinor!)} in all).`
                        }`}
                </li>
              )}
            </ul>
          </div>
        </div>

        {shown.has(debt.id) && (
          <div className="mt-4 border-t border-line pt-3">
            <h4 className="text-sm font-semibold">Payments since {sinceDay(day(debt.balanceDate))}</h4>
            {status.payments.length === 0 ? (
              <p className="mt-1 text-sm text-muted">None recorded yet.</p>
            ) : (
              <ShortList items={[...status.payments].reverse()} initial={5} noun="payments">
                {(visible) => (
                  <ul className="mt-1 divide-y divide-line text-sm">
                    {visible.map((t) => (
                      <li key={t.id} className="flex min-h-11 items-center justify-between gap-3">
                        <span className="text-muted">{day(t.date)}</span>
                        <span className="tabular-nums">{money(t.amount.amountMinor)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </ShortList>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {!debt.archived && !status.paidOff && (
            <button type="button" aria-label={`Record a payment on ${debt.name}`} onClick={() => recordPayment(debt)} className={primaryButtonClass}>
              Record payment
            </button>
          )}
          <button
            type="button"
            aria-expanded={shown.has(debt.id)}
            aria-label={`Payments on ${debt.name}`}
            onClick={() =>
              setShown((s) => {
                const next = new Set(s);
                if (next.has(debt.id)) next.delete(debt.id);
                else next.add(debt.id);
                return next;
              })
            }
            className={secondaryButtonClass}
          >
            Payments ({status.payments.length})
          </button>
          <button type="button" aria-label={`Update ${debt.name}`} onClick={() => setOpen(debt.id)} className={secondaryButtonClass}>
            Update
          </button>
          <button
            type="button"
            aria-label={`${debt.archived ? "Bring back" : "Archive"} ${debt.name}`}
            onClick={() => void act(setArchived(debt.id, !debt.archived), debt.archived ? `${debt.name} brought back` : `${debt.name} archived`)}
            className={secondaryButtonClass}
          >
            {debt.archived ? "Bring back" : "Archive"}
          </button>
          <button
            type="button"
            aria-label={`Delete ${debt.name}`}
            onClick={() => {
              if (window.confirm(`Delete ${debt.name}? Its payments stay in your transactions.`)) {
                void act(removeDebt(debt.id), `${debt.name} deleted`);
              }
            }}
            className={dangerButtonClass}
          >
            Delete
          </button>
        </div>
      </li>
    );
  }

  const active = debts.filter((d) => !d.archived);
  const archived = debts.filter((d) => d.archived);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-prose text-sm text-muted">
          Loans, credit cards, installments. A payment is recorded as an expense in Debt Payments: it counts once as
          spending, and brings the debt down. What&apos;s left is worked out from the balance you enter and the
          payments since; interest is only counted with a rate you give.
        </p>
        {open !== "new" && (
          <button type="button" onClick={() => setOpen("new")} className={primaryButtonClass}>
            <span aria-hidden="true" className="mr-1.5 text-lg leading-none">+</span>
            Add debt
          </button>
        )}
      </div>

      {(error || editor.saveFailed) && (
        <p role="alert" className="mt-4 rounded-control border border-danger-line bg-danger-surface px-4 py-3 text-sm text-danger">
          {error ?? "Pocketwise couldn't save your last change. Check your connection and try again."}
        </p>
      )}

      {open === "new" && (
        <section aria-labelledby="new-debt-heading" className={`${cardClass} mt-6 p-4 sm:p-6`}>
          <h2 id="new-debt-heading" className="mb-4 font-semibold">New debt</h2>
          <DebtForm rules={rules} defaultCurrency={main} today={today} onCancel={() => setOpen(null)} onSubmit={(fields) => submit(createDebt(fields, today), `${fields.name} added`)} />
        </section>
      )}

      <h2 ref={headingRef} tabIndex={-1} className="sr-only">Your debts</h2>
      {active.length === 0 && open !== "new" ? (
        <p className="mt-6 rounded-card border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">
          No debts. If you have a loan or installments, add them to see when they&apos;ll be paid off.
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">{active.map(card)}</ul>
      )}
      {archived.length > 0 && (
        <section aria-labelledby="archived-debts" className="mt-10">
          <h2 id="archived-debts" className="text-lg font-semibold">Archived</h2>
          <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">{archived.map(card)}</ul>
        </section>
      )}
      <p className="mt-6 text-sm text-muted">
        See what extra payments would change in <Link href="/what-if" className="font-medium text-foreground underline">What if</Link>.
      </p>

      <Toast notice={notice ?? editor.notice} />
      <Sheet open={editor.sheetOpen} title="Record a payment" onClose={editor.closeSheet} fallbackFocusRef={headingRef}>
        {editor.hasContent && (
          <TransactionForm
            key={editor.sheet.session}
            transaction={editor.editing}
            prefill={editor.prefill}
            accounts={accounts}
            categories={categories}
            defaultCurrency={main}
            onSave={editor.save}
            onCancel={editor.closeSheet}
          />
        )}
      </Sheet>
    </>
  );
}

/** Adds or updates a debt; what the user enters is kept as entered. */
function DebtForm({
  debt,
  rules,
  defaultCurrency,
  today,
  onSubmit,
  onCancel,
}: {
  debt?: Debt;
  rules: RecurringRule[];
  defaultCurrency: string;
  today: string;
  onSubmit: (fields: DebtFields) => Promise<SaveResult>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(debt?.name ?? "");
  const [currency, setCurrency] = useState(debt?.currency ?? defaultCurrency);
  const text = (minor: number | null | undefined) => (minor ? amountToInputText({ amountMinor: minor, currency }) : "");
  const [balance, setBalance] = useState(text(debt?.balanceMinor));
  // Today, even when updating: a new balance comes with its own date.
  const [balanceDate, setBalanceDate] = useState(today);
  const [payment, setPayment] = useState(text(debt?.paymentMinor));
  const [frequency, setFrequency] = useState<Frequency>(debt?.frequency ?? "monthly");
  const [nextDue, setNextDue] = useState(debt?.nextDue ?? "");
  const [rate, setRate] = useState(debt?.annualRate ?? "");
  const [original, setOriginal] = useState(text(debt?.originalMinor));
  const [ruleId, setRuleId] = useState(debt?.ruleId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const decimals = currencyDecimals(currency);
  const ruleChoices = rules.filter((r) => r.type === "expense" && r.amount.currency === currency);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const balanceMinor = parseAmount(balance, currency);
    const paymentMinor = parseAmount(payment, currency);
    const originalMinor = original.trim() ? parseAmount(original, currency) : null;
    if (balanceMinor === null) return setError(`Enter what's still owed, more than zero${decimals === 0 ? " (no decimals)" : ""}.`);
    if (paymentMinor === null) return setError("Enter the installment, more than zero.");
    if (original.trim() && originalMinor === null) return setError("The amount borrowed must be more than zero, or empty.");
    const fields: DebtFields = {
      name: name.trim(),
      currency,
      balanceMinor,
      balanceDate,
      paymentMinor,
      frequency,
      nextDue: nextDue || null,
      annualRate: rate.trim() || null,
      originalMinor,
      ruleId: ruleChoices.some((r) => r.id === ruleId) ? ruleId : null,
    };
    const problem = debtProblem(fields, today);
    if (problem) return setError(problem);
    setError(null);
    setSaving(true);
    const result = await onSubmit(fields);
    setSaving(false);
    if (!result.ok) setError(result.message);
  }

  const amountField = (label: string, value: string, set: (v: string) => void, optional = false) => (
    <label className="block text-sm font-medium">
      {label} ({currency}){optional && <span className="font-normal text-muted"> (optional)</span>}
      <input type="text" inputMode="decimal" autoComplete="off" placeholder={decimals === 0 ? "0" : `0.${"0".repeat(decimals)}`} value={value} onChange={(e) => set(e.target.value)} className={fieldClass} />
    </label>
  );

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium sm:col-span-2">
          Name
          <input type="text" maxLength={MAX_DEBT_NAME_LENGTH} autoComplete="off" placeholder="Like: Car loan, Credit card" value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
        </label>
        {debt ? (
          <div className="text-sm font-medium">
            Currency
            <p className="mt-1 flex min-h-11 items-center font-normal text-muted">{currency}</p>
          </div>
        ) : (
          <label className="block text-sm font-medium">
            Currency
            <CurrencySelect value={currency} onChange={setCurrency} />
          </label>
        )}
        {amountField("Still owed", balance, setBalance)}
        <label className="block text-sm font-medium">
          On
          <input type="date" value={balanceDate} max={today} onChange={(e) => setBalanceDate(e.target.value)} className={fieldClass} />
        </label>
        {amountField("Installment", payment, setPayment)}
        <label className="block text-sm font-medium">
          How often
          <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className={fieldClass}>
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {FREQUENCY_LABELS[f]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Next installment <span className="font-normal text-muted">(optional)</span>
          <input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} className={fieldClass} />
        </label>
        <label className="block text-sm font-medium">
          Yearly interest rate, % <span className="font-normal text-muted">(if you know it)</span>
          <input type="text" inputMode="decimal" autoComplete="off" placeholder="Like: 12.5" value={rate} onChange={(e) => setRate(e.target.value)} className={fieldClass} />
        </label>
        {amountField("Amount first borrowed", original, setOriginal, true)}
        <label className="block text-sm font-medium sm:col-span-2">
          Paid through a recurring item <span className="font-normal text-muted">(optional)</span>
          <select value={ruleId} onChange={(e) => setRuleId(e.target.value)} className={fieldClass}>
            <option value="">No</option>
            {ruleChoices.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({formatMoney(r.amount)})
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-3 text-xs text-muted">
        &quot;Still owed&quot; is the balance on that date, before any payment that day. Without a rate, Pocketwise
        doesn&apos;t guess one: payoff is shown without interest.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {debt ? "Save changes" : "Add debt"}
        </button>
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>
          Cancel
        </button>
      </div>
    </form>
  );
}
