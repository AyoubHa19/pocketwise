"use client";

import { Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cardClass, colorTransition } from "@/components/formStyles";
import { MonthPicker } from "@/components/MonthPicker";
import { OccurrenceRow } from "@/components/OccurrenceRow";
import { Sheet } from "@/components/Sheet";
import { Toast, type Notice } from "@/components/Toast";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { useTransactionEditor } from "@/components/useTransactionEditor";
import {
  useAccountPreferences,
  useAccounts,
  useAccountSettings,
  useAccountTransactions,
  useCategories,
  useGoals,
  useRecurringRules,
  useSetSkipped,
} from "@/lib/accountData";
import { calendarDays, monthGrid, weekdayNames, type CalendarDay } from "@/lib/calendar";
import { formatMonth, monthOf } from "@/lib/dates";
import { currencyDecimals, formatMoney } from "@/lib/money";
import { DEFAULT_PREFERENCES, formatDay } from "@/lib/preferences";
import { useToday } from "@/lib/useToday";

/** A short amount for a small calendar cell: 1,504.99 → "1.5K". */
function short(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(
    amountMinor / 10 ** currencyDecimals(currency),
  );
}

/**
 * The financial calendar (PRD 19): a month in weeks, starting on the day
 * the user chose. Each day shows what happened (income and spending) apart
 * from what's expected (recurring items not recorded yet, goal dates).
 * Choosing a day lists it all below, where transactions open for editing
 * and expected items can be recorded or skipped.
 */
export function CalendarView() {
  const transactions = useAccountTransactions();
  const rules = useRecurringRules();
  const goals = useGoals();
  const accounts = useAccounts();
  const categories = useCategories();
  const settings = useAccountSettings();
  const preferences = useAccountPreferences();
  const setSkipped = useSetSkipped();
  const editor = useTransactionEditor(transactions);
  const today = useToday();
  const detailsRef = useRef<HTMLHeadingElement>(null);

  const [pickedMonth, setPickedMonth] = useState<string | null>(null);
  const [direction, setDirection] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (
    transactions === null ||
    rules === null ||
    goals === null ||
    accounts === null ||
    categories === null ||
    settings === null ||
    preferences === null
  ) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  const mainCurrency = settings.currency ?? "";
  const dateOrder = preferences.dateOrder ?? DEFAULT_PREFERENCES.dateOrder;
  const weekStart = preferences.weekStart ?? DEFAULT_PREFERENCES.weekStart;
  const currentMonth = monthOf(today);
  const month = pickedMonth ?? currentMonth;
  const weeks = monthGrid(month, weekStart);
  const days = calendarDays(weeks[0][0], weeks[weeks.length - 1][6], {
    transactions,
    rules,
    goals,
    mainCurrency,
    today,
  });
  // The day shown below: the one picked, if it's in this month's grid,
  // else today (in this month), else the 1st.
  const selected =
    picked && days.has(picked) ? picked : monthOf(today) === month ? today : `${month}-01`;
  const day = days.get(selected)!;
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency: mainCurrency });

  function changeMonth(next: string) {
    if (next !== month) setDirection(next > month ? 1 : -1);
    setPickedMonth(next);
    setPicked(null);
  }

  /** The day in words, for its button: what a sighted user reads off the cell, and more. */
  function describe(d: CalendarDay): string {
    const parts = [formatDay(d.date, today, dateOrder)];
    if (d.spendingMinor > 0) parts.push(`spent ${money(d.spendingMinor)}`);
    if (d.incomeMinor > 0) parts.push(`received ${money(d.incomeMinor)}`);
    if (d.transactions.length > 0) {
      parts.push(d.transactions.length === 1 ? "1 transaction" : `${d.transactions.length} transactions`);
    }
    if (d.expected.length > 0) parts.push(`${d.expected.length} expected`);
    if (d.goals.length > 0) parts.push(d.goals.length === 1 ? "1 goal date" : `${d.goals.length} goal dates`);
    return parts.join(", ");
  }

  const names = weekdayNames(weekStart);
  const longNames = weekdayNames(weekStart, "long");

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <section aria-labelledby="calendar-heading">
          <h2 id="calendar-heading" className="sr-only">
            {formatMonth(month)}
          </h2>
          <div className="max-w-md">
            <MonthPicker month={month} currentMonth={currentMonth} direction={direction} onChange={changeMonth} />
          </div>

          <ul aria-label="What the marks mean" className="glass-strong mt-4 flex w-fit max-w-full flex-wrap gap-x-4 gap-y-1 rounded-2xl px-3 py-2 text-xs text-muted">
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-foreground" />
              Spent
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-positive" />
              Received
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-2 rounded-full border-2 border-dashed border-warning" />
              Expected, not recorded yet
            </li>
            <li className="flex items-center gap-1.5">
              <Target size={12} aria-hidden="true" />
              Goal date
            </li>
            {mainCurrency && <li>Amounts in {mainCurrency}</li>}
          </ul>

          <table className={`${cardClass} mt-3 w-full table-fixed border-separate border-spacing-0 overflow-hidden`}>
            <thead>
              <tr>
                {names.map((name, i) => (
                  <th key={name} scope="col" abbr={longNames[i]} className="py-2 text-xs font-medium text-muted">
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week[0]}>
                  {week.map((date) => {
                    const d = days.get(date)!;
                    const inMonth = monthOf(date) === month;
                    const isToday = date === today;
                    const isSelected = date === selected;
                    return (
                      <td key={date} className="border-t border-line p-0.5 align-top">
                        <button
                          type="button"
                          aria-label={describe(d)}
                          aria-pressed={isSelected}
                          aria-current={isToday ? "date" : undefined}
                          onClick={() => setPicked(date)}
                          className={`flex h-14 w-full flex-col items-stretch rounded-control p-1 text-left sm:h-20 sm:p-1.5 ${colorTransition} ${
                            isSelected ? "bg-surface-muted ring-2 ring-accent" : "hover:bg-surface-muted"
                          }`}
                        >
                          <span
                            className={`self-start text-xs tabular-nums ${
                              isToday
                                ? "flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 font-semibold text-accent-foreground"
                                : inMonth
                                  ? "font-medium"
                                  : "text-muted"
                            }`}
                          >
                            {Number(date.slice(8))}
                          </span>
                          {/* Phones: marks only. From sm: short amounts. */}
                          <span aria-hidden="true" className="mt-auto flex flex-wrap items-center gap-1 sm:hidden">
                            {d.spendingMinor > 0 && <span className="h-1.5 w-1.5 rounded-full bg-foreground" />}
                            {d.incomeMinor > 0 && <span className="h-1.5 w-1.5 rounded-full bg-positive" />}
                            {d.expected.length > 0 && (
                              <span className="h-2 w-2 rounded-full border-2 border-dashed border-warning" />
                            )}
                            {d.goals.length > 0 && <Target size={10} />}
                          </span>
                          <span aria-hidden="true" className="mt-auto hidden space-y-0.5 text-[11px] leading-tight tabular-nums sm:block">
                            {d.spendingMinor > 0 && <span className="block truncate">-{short(d.spendingMinor, mainCurrency)}</span>}
                            {d.incomeMinor > 0 && (
                              <span className="block truncate text-positive">+{short(d.incomeMinor, mainCurrency)}</span>
                            )}
                            {(d.expected.length > 0 || d.goals.length > 0) && (
                              <span className="flex items-center gap-1">
                                {d.expected.length > 0 && (
                                  <span className="rounded border border-dashed border-warning px-1 text-warning">
                                    {d.expected.length}
                                  </span>
                                )}
                                {d.goals.length > 0 && <Target size={11} />}
                              </span>
                            )}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Named apart from the day's own list inside it, which has the
            same date as its heading. */}
        <section aria-label={`Selected day: ${formatDay(selected, today, dateOrder)}`} className="lg:sticky lg:top-6">
          <h2 id="day-heading" ref={detailsRef} tabIndex={-1} className="text-lg font-semibold">
            {formatDay(selected, today, dateOrder)}
          </h2>

          {day.transactions.length === 0 && day.expected.length === 0 && day.goals.length === 0 && (
            <p className="mt-3 rounded-card border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">
              Nothing on this day.
            </p>
          )}

          {day.expected.length > 0 && (
            <div className="mt-3">
              <h3 className="text-sm font-semibold text-muted">Expected, not recorded yet</h3>
              <ul className="mt-2 divide-y divide-line overflow-hidden rounded-card border border-dashed border-warning bg-surface">
                {day.expected.map((o) => (
                  <OccurrenceRow
                    key={`${o.rule.id}-${o.date}`}
                    occurrence={o}
                    today={today}
                    dateOrder={dateOrder}
                    categoryName={categoryNames.get(o.rule.categoryId) ?? ""}
                    onRecord={editor.openPrefilled}
                    onSkip={async () => {
                      const result = await setSkipped(o.rule.id, o.date, true);
                      setNotice((p) => ({
                        id: (p?.id ?? 0) + 1,
                        text: result.ok ? `${o.rule.name} skipped` : result.message,
                      }));
                    }}
                  />
                ))}
              </ul>
            </div>
          )}

          {day.goals.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-muted">Goals to reach by this day</h3>
              <ul className="mt-2 space-y-1">
                {day.goals.map((g) => (
                  <li key={g.id} className="flex items-center gap-2 text-sm">
                    <Target size={16} aria-hidden="true" />
                    <Link href="/goals" className="font-medium underline underline-offset-2">
                      {g.name}
                    </Link>
                    <span className="text-muted">· {formatMoney(g.target)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {day.transactions.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold text-muted">What happened</h3>
              <TransactionList
                transactions={day.transactions}
                emptyMessage=""
                today={today}
                dateOrder={dateOrder}
                editingId={editor.sheetOpen && editor.editing ? editor.editing.id : null}
                onEdit={editor.openEdit}
                accountNames={new Map(accounts.map((a) => [a.id, a.name]))}
                showAccounts={accounts.filter((a) => !a.archived).length > 1}
              />
            </div>
          )}

          {editor.saveFailed && (
            <p role="alert" className="mt-4 text-sm text-danger">
              Pocketwise couldn&apos;t save your last change. Check your connection and try again.
            </p>
          )}
        </section>
      </div>

      <Toast notice={notice ?? editor.notice} />

      <Sheet
        open={editor.sheetOpen}
        title={editor.sheet.kind === "edit" ? "Edit transaction" : "Record it"}
        onClose={editor.closeSheet}
        fallbackFocusRef={detailsRef}
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
