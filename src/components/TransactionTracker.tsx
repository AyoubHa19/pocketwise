"use client";

import { useRef, useState } from "react";
import { AccountBalanceCard } from "@/components/AccountBalanceCard";
import { CurrencySetup } from "@/components/CurrencySetup";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import {
  dashboardChartsArea,
  dashboardGridClass,
  dashboardListArea,
  dashboardSummaryArea,
  primaryButtonClass,
} from "@/components/formStyles";
import { MonthlyTrend } from "@/components/MonthlyTrend";
import { MonthPicker } from "@/components/MonthPicker";
import { MonthSummary } from "@/components/MonthSummary";
import { Sheet } from "@/components/Sheet";
import { SpendingByCategory } from "@/components/SpendingByCategory";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { formatMonth, monthOf } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { useSettings } from "@/lib/settingsStore";
import {
  monthlyTotals,
  spendingByCategory,
  totalsByCurrency,
  transactionsInMonth,
} from "@/lib/summary";
import { updateTransactions, useTransactions } from "@/lib/transactionStore";
import {
  removeTransaction,
  signedAmount,
  upsertTransaction,
  type Transaction,
} from "@/lib/transactions";
import { useToday } from "@/lib/useToday";

/** What the add/edit sheet is doing. Only one of these can be true at once. */
type SheetState =
  | { kind: "closed" }
  | { kind: "add" }
  | { kind: "edit"; id: string };

export function TransactionTracker() {
  const settings = useSettings();
  const transactions = useTransactions();
  const today = useToday();
  // null until the user moves to another month; until then, this month.
  const [pickedMonth, setPickedMonth] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState>({ kind: "closed" });
  const [saveFailed, setSaveFailed] = useState(false);
  // Where focus goes after deleting, when the row that opened the sheet is
  // gone: the list's heading, right where the row was.
  const listHeadingRef = useRef<HTMLHeadingElement>(null);

  const currentMonth = monthOf(today);
  const month = pickedMonth ?? currentMonth;

  // Looked up by id, so if the transaction disappears while its sheet is
  // open (say, deleted in another tab), the sheet simply closes.
  const editing =
    sheet.kind === "edit"
      ? transactions?.find((t) => t.id === sheet.id)
      : undefined;
  const sheetOpen = sheet.kind === "add" || editing !== undefined;

  function openAdd() {
    setSheet({ kind: "add" });
  }

  function closeSheet() {
    setSheet({ kind: "closed" });
  }

  function save(transaction: Transaction) {
    const saved = updateTransactions((previous) =>
      upsertTransaction(previous, transaction),
    );
    setSaveFailed(!saved);
    closeSheet();
    // Show the month the transaction is in, or it would seem to vanish when
    // its date is in a different month from the one on screen.
    setPickedMonth(monthOf(transaction.date));
  }

  function remove(transaction: Transaction) {
    const amount = formatMoney(signedAmount(transaction));
    const confirmed = window.confirm(
      `Delete ${transaction.category}, ${amount} on ${transaction.date}? This can't be undone.`,
    );
    if (!confirmed) return;

    const saved = updateTransactions((previous) =>
      removeTransaction(previous, transaction.id),
    );
    setSaveFailed(!saved);
    closeSheet();
  }

  // Both come from the browser's storage, so they're null while the server
  // renders the page and for a moment after it opens.
  if (settings === null || transactions === null) {
    return <DashboardSkeleton />;
  }
  if (settings.currency === null) {
    return <CurrencySetup />;
  }

  const monthTransactions = transactionsInMonth(transactions, month);
  const monthName = formatMonth(month);

  return (
    <>
      {/* Room at the bottom on phones, so the floating Add button never
          covers the last transaction. */}
      <div className={`${dashboardGridClass} pb-24 sm:pb-0`}>
        <section
          aria-label={`Summary for ${monthName}`}
          className={`space-y-4 ${dashboardSummaryArea}`}
        >
          <AccountBalanceCard
            transactions={transactions}
            openingBalance={settings.openingBalance}
            today={today}
          />
          <MonthPicker
            month={month}
            currentMonth={currentMonth}
            onChange={setPickedMonth}
          />
          <MonthSummary
            totals={totalsByCurrency(monthTransactions, settings.currency)}
          />
        </section>

        <section
          aria-labelledby="transactions-heading"
          className={dashboardListArea}
        >
          <div className="flex min-h-11 items-center justify-between gap-4">
            {/* tabIndex -1: focusable from code, but not a Tab stop. */}
            <h2
              id="transactions-heading"
              ref={listHeadingRef}
              tabIndex={-1}
              className="text-lg font-semibold"
            >
              Transactions in {monthName}
            </h2>
            {/* From sm up, Add sits beside the list it adds to. The wrapper
                does the hiding, because the button's own classes already
                set its display. */}
            <div className="hidden shrink-0 sm:block">
              <button
                type="button"
                onClick={openAdd}
                className={primaryButtonClass}
              >
                <span aria-hidden="true" className="mr-1.5 text-lg leading-none">
                  +
                </span>
                Add transaction
              </button>
            </div>
          </div>

          {saveFailed && (
            <p
              role="alert"
              className="mt-4 rounded-control border border-danger-line bg-danger-surface px-4 py-3 text-sm text-danger"
            >
              Your browser didn&apos;t let Pocketwise save. Your latest changes
              will be lost when you close this page. Storage may be full, or
              blocked by private browsing or privacy settings.
            </p>
          )}

          <div className="mt-4">
            <TransactionList
              transactions={monthTransactions}
              emptyMessage={
                transactions.length === 0
                  ? "No transactions yet. Use the Add button to record your first one."
                  : `No transactions in ${monthName}.`
              }
              today={today}
              editingId={editing?.id ?? null}
              onEdit={(transaction) =>
                setSheet({ kind: "edit", id: transaction.id })
              }
            />
          </div>

          <p className="mt-3 text-sm text-muted">
            Saved in this browser on this device only. Clearing your browser
            data deletes them.
          </p>
        </section>

        {/* After the list on phones; under the summary on large screens. */}
        <div className={`space-y-4 ${dashboardChartsArea}`}>
          <SpendingByCategory
            categories={spendingByCategory(monthTransactions, settings.currency)}
            currency={settings.currency}
            monthName={monthName}
          />
          <MonthlyTrend
            months={monthlyTotals(transactions, month, 6, settings.currency)}
            selectedMonth={month}
            currency={settings.currency}
          />
        </div>
      </div>

      {/* On phones, Add floats in the bottom corner, within thumb's reach. */}
      <button
        type="button"
        onClick={openAdd}
        aria-label="Add transaction"
        className="fixed right-4 bottom-6 z-10 inline-flex h-14 items-center gap-2 rounded-full bg-accent px-6 text-base font-semibold text-accent-foreground shadow-lg sm:hidden"
      >
        <span aria-hidden="true" className="text-2xl leading-none">
          +
        </span>
        Add
      </button>

      <Sheet
        open={sheetOpen}
        title={editing ? "Edit transaction" : "Add a transaction"}
        onClose={closeSheet}
        fallbackFocusRef={listHeadingRef}
      >
        {/* A new key makes React start a fresh form with the new values. */}
        <TransactionForm
          key={editing?.id ?? "new"}
          transaction={editing}
          defaultCurrency={settings.currency}
          onSave={save}
          onCancel={closeSheet}
          onDelete={editing ? () => remove(editing) : undefined}
        />
      </Sheet>
    </>
  );
}
