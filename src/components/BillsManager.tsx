"use client";

import { useEffect, useRef, useState } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import {
  cardClass,
  dangerButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/formStyles";
import { RuleForm } from "@/components/RuleForm";
import { Sheet } from "@/components/Sheet";
import { Toast, type Notice } from "@/components/Toast";
import { TransactionForm } from "@/components/TransactionForm";
import { useTransactionEditor } from "@/components/useTransactionEditor";
import { OccurrenceRow } from "@/components/OccurrenceRow";
import {
  useAccountPreferences,
  useAccounts,
  useAccountSettings,
  useAccountTransactions,
  useCategories,
  useCreateRule,
  useRecurringRules,
  useRemoveRule,
  useSetRulePaused,
  useSetSkipped,
  useUpdateRule,
  type SaveResult,
} from "@/lib/accountData";
import { addDays } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { DEFAULT_PREFERENCES, formatDay } from "@/lib/preferences";
import {
  FREQUENCY_LABELS,
  needsAttention,
  nextDue,
  occurrences,
  type RecurringRule,
} from "@/lib/recurring";
import { useToday } from "@/lib/useToday";

/**
 * The Bills page (PRD 14): what needs recording now (overdue, due today,
 * or coming up within its reminder), and every recurring item, to add,
 * edit, pause or delete. Recording opens the usual transaction form,
 * filled in, so the amount and day can be corrected before saving.
 */
export function BillsManager() {
  const rules = useRecurringRules();
  const transactions = useAccountTransactions();
  const accounts = useAccounts();
  const categories = useCategories();
  const settings = useAccountSettings();
  const preferences = useAccountPreferences();
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();
  const setPaused = useSetRulePaused();
  const setSkipped = useSetSkipped();
  const removeRule = useRemoveRule();
  const editor = useTransactionEditor(transactions);
  const today = useToday();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [open, setOpen] = useState<"new" | string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (
    rules === null ||
    transactions === null ||
    accounts === null ||
    categories === null ||
    settings === null ||
    preferences === null
  ) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  const mainCurrency = settings.currency ?? "";
  const dateOrder = preferences.dateOrder ?? DEFAULT_PREFERENCES.dateOrder;
  const day = (date: string) => formatDay(date, today, dateOrder);
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const accountNames = new Map(accounts.map((a) => [a.id, a.name]));
  const attention = needsAttention(rules, transactions, today);

  // What's still to pay in the next 30 days, in the main currency.
  const in30 = rules
    .filter((r) => r.type === "expense" && r.amount.currency === mainCurrency)
    .flatMap((r) => occurrences(r, transactions, today, addDays(today, 30)))
    .filter((o) => o.state !== "paid" && o.state !== "skipped");
  const in30Total = in30.reduce((sum, o) => sum + o.rule.amount.amountMinor, 0);

  function say(text: string) {
    setError(null);
    setNotice((previous) => ({ id: (previous?.id ?? 0) + 1, text }));
  }

  async function act(run: Promise<SaveResult>, done: string) {
    const result = await run;
    if (result.ok) say(done);
    else setError(result.message);
  }

  async function submit(run: Promise<SaveResult>, done: string): Promise<SaveResult> {
    const result = await run;
    if (result.ok) {
      setOpen(null);
      say(done);
    }
    return result;
  }

  function confirmDelete(rule: RecurringRule) {
    if (!window.confirm(`Delete ${rule.name}? What you've already recorded stays in your transactions.`)) return;
    void act(removeRule(rule.id), `${rule.name} deleted`);
  }

  function card(rule: RecurringRule) {
    if (open === rule.id) {
      return (
        <li key={rule.id} className={`${cardClass} p-4 sm:p-6`}>
          <h3 className="mb-4 font-semibold">Edit {rule.name}</h3>
          <RuleForm
            rule={rule}
            accounts={accounts!}
            categories={categories!}
            defaultCurrency={mainCurrency}
            onCancel={() => setOpen(null)}
            onSubmit={(fields) => submit(updateRule(rule.id, fields, today), "Changes saved")}
          />
        </li>
      );
    }
    const next = nextDue(rule, transactions!, today);
    const recorded = transactions!.filter((t) => t.id.startsWith(`recurring-${rule.id}-`)).length;
    const skipped = rule.skipped.filter((d) => d >= rule.trackFrom);
    const money = formatMoney(rule.amount);
    const category = categoryNames.get(rule.categoryId) ?? "";
    return (
      <li key={rule.id} className={`${cardClass} p-4 sm:p-6`}>
        <div className="flex gap-3">
          <CategoryIcon category={category} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="min-w-0 truncate font-semibold">{rule.name}</h3>
              <p className={`shrink-0 font-medium tabular-nums ${rule.type === "income" ? "text-positive" : ""}`}>
                {rule.type === "income" ? money : `-${money}`}
              </p>
            </div>
            <p className="mt-0.5 text-sm text-muted">
              {FREQUENCY_LABELS[rule.frequency]} · {category}
              {rule.accountId && ` · ${accountNames.get(rule.accountId) ?? ""}`}
            </p>
            <p className="mt-2 text-sm">
              {rule.paused
                ? "Paused: nothing is listed until you resume it."
                : next
                  ? `Next: ${day(next.date)}${next.state === "overdue" ? " (overdue)" : ""}`
                  : "Ended: no more dates."}
            </p>
            <p className="mt-0.5 text-sm text-muted">
              {rule.endDate ? `Until ${day(rule.endDate)} · ` : ""}
              {rule.remindDays === 0 ? "Listed on the day" : `Listed ${rule.remindDays} ${rule.remindDays === 1 ? "day" : "days"} ahead`}
              {` · Recorded ${recorded === 1 ? "once" : `${recorded} times`}`}
            </p>
            {skipped.length > 0 && (
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
                Skipped:
                {skipped.map((date) => (
                  <button
                    key={date}
                    type="button"
                    aria-label={`Undo skipping ${rule.name} on ${day(date)}`}
                    onClick={() => void act(setSkipped(rule.id, date, false), `${rule.name} on ${day(date)} is back`)}
                    className="min-h-11 font-medium text-foreground underline underline-offset-2"
                  >
                    {day(date)} (undo)
                  </button>
                ))}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            aria-label={`Edit ${rule.name}`}
            onClick={() => setOpen(rule.id)}
            className={secondaryButtonClass}
          >
            Edit
          </button>
          <button
            type="button"
            aria-label={`${rule.paused ? "Resume" : "Pause"} ${rule.name}`}
            onClick={() =>
              void act(setPaused(rule.id, !rule.paused, today), rule.paused ? `${rule.name} resumed` : `${rule.name} paused`)
            }
            className={secondaryButtonClass}
          >
            {rule.paused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            aria-label={`Delete ${rule.name}`}
            onClick={() => confirmDelete(rule)}
            className={dangerButtonClass}
          >
            Delete
          </button>
        </div>
      </li>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-prose text-sm text-muted">
          Rent, subscriptions, a salary: anything that comes back regularly.
          Pocketwise lists each one when it&apos;s due and never counts it
          as paid until you record it, so your totals stay true.
        </p>
        {open !== "new" && (
          <button type="button" onClick={() => setOpen("new")} className={primaryButtonClass}>
            <span aria-hidden="true" className="mr-1.5 text-lg leading-none">+</span>
            Add recurring item
          </button>
        )}
      </div>

      {(error || editor.saveFailed) && (
        <p role="alert" className="mt-4 rounded-control border border-danger-line bg-danger-surface px-4 py-3 text-sm text-danger">
          {error ?? "Pocketwise couldn't save your last change to your account. Check your connection and try again."}
        </p>
      )}

      {open === "new" && (
        <section aria-labelledby="new-rule-heading" className={`${cardClass} mt-6 p-4 sm:p-6`}>
          <h2 id="new-rule-heading" className="mb-4 font-semibold">New recurring item</h2>
          <RuleForm
            accounts={accounts}
            categories={categories}
            defaultCurrency={mainCurrency}
            onCancel={() => setOpen(null)}
            onSubmit={(fields) => submit(createRule(fields, today), `${fields.name} added`)}
          />
        </section>
      )}

      <section aria-labelledby="attention-heading" className="mt-8">
        <h2 id="attention-heading" ref={headingRef} tabIndex={-1} className="text-lg font-semibold">
          To record
        </h2>
        {mainCurrency && in30.length > 0 && (
          <p className="mt-1 text-sm text-muted">
            Bills in the next 30 days: {formatMoney({ amountMinor: in30Total, currency: mainCurrency })} ({in30.length})
          </p>
        )}
        {attention.length === 0 ? (
          <p className="mt-4 rounded-card border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">
            {rules.length === 0 ? "No recurring items yet." : "Nothing to record right now."}
          </p>
        ) : (
          <ul className={`${cardClass} mt-4 divide-y divide-line overflow-clip`}>
            {attention.map((o) => (
              <OccurrenceRow
                key={`${o.rule.id}-${o.date}`}
                occurrence={o}
                today={today}
                dateOrder={dateOrder}
                categoryName={categoryNames.get(o.rule.categoryId) ?? ""}
                onRecord={editor.openPrefilled}
                onSkip={() => void act(setSkipped(o.rule.id, o.date, true), `${o.rule.name} on ${day(o.date)} skipped`)}
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="rules-heading" className="mt-10">
        <h2 id="rules-heading" className="text-lg font-semibold">
          Recurring items
        </h2>
        {rules.length === 0 && open !== "new" ? (
          <p className="mt-4 text-sm text-muted">Add your rent, bills, subscriptions or salary to see them here.</p>
        ) : (
          <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">{rules.map(card)}</ul>
        )}
      </section>

      <Toast notice={notice ?? editor.notice} />

      <Sheet
        open={editor.sheetOpen}
        title={editor.sheet.kind === "edit" ? "Edit transaction" : "Record it"}
        onClose={editor.closeSheet}
        fallbackFocusRef={headingRef}
      >
        {editor.hasContent && (
          <TransactionForm
            key={editor.sheet.session}
            transaction={editor.editing}
            prefill={editor.prefill}
            accounts={accounts}
            categories={categories}
            defaultCurrency={mainCurrency}
            onSave={editor.save}
            onCancel={editor.closeSheet}
            onDelete={editor.editing ? () => editor.remove(editor.editing!) : undefined}
          />
        )}
      </Sheet>
    </>
  );
}
