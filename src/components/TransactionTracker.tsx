"use client";

// Motion's own entry point for the light `m` components, which keeps the
// bundle smaller than importing them from "motion/react".
import * as m from "motion/react-m";
import { useEffect, useRef, useState } from "react";
import { AccountBalanceCard } from "@/components/AccountBalanceCard";
import { CurrencySetup } from "@/components/CurrencySetup";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import {
  dashboardChartsArea,
  dashboardGridClass,
  dashboardListArea,
  dashboardSummaryArea,
  pressable,
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
import { fadeRise } from "@/lib/motion";
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

// The dashboard's entrance plays once per visit to the site, not again each
// time you come back from Settings, which would get tiresome.
let entrancePlayed = false;

/**
 * What the add/edit sheet shows: adding, or editing one transaction. It
 * keeps that after `open` turns false, so the sheet can slide out still
 * showing what it showed, not an empty or different form. `session` goes
 * up with every opening and gives the form a fresh start each time.
 */
type SheetState = { open: boolean; session: number } & (
  | { kind: "add" }
  | { kind: "edit"; id: string }
);

export function TransactionTracker() {
  const settings = useSettings();
  const transactions = useTransactions();
  const today = useToday();
  // null until the user moves to another month; until then, this month.
  const [pickedMonth, setPickedMonth] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState>({
    kind: "add",
    open: false,
    session: 0,
  });
  const [saveFailed, setSaveFailed] = useState(false);
  // Where focus goes after deleting, when the row that opened the sheet is
  // gone: the list's heading, right where the row was.
  const listHeadingRef = useRef<HTMLHeadingElement>(null);
  // Read once, when the dashboard first appears on this visit.
  const [playEntrance] = useState(() => !entrancePlayed);
  useEffect(() => {
    entrancePlayed = true;
  }, []);

  const currentMonth = monthOf(today);
  const month = pickedMonth ?? currentMonth;

  // Looked up by id, so if the transaction disappears while its sheet is
  // open (say, deleted in another tab), the sheet simply closes.
  const editing =
    sheet.kind === "edit"
      ? transactions?.find((t) => t.id === sheet.id)
      : undefined;
  const hasContent = sheet.kind === "add" || editing !== undefined;
  const sheetOpen = sheet.open && hasContent;

  function openAdd() {
    setSheet((previous) => ({
      kind: "add",
      open: true,
      session: previous.session + 1,
    }));
  }

  function openEdit(transaction: Transaction) {
    setSheet((previous) => ({
      kind: "edit",
      id: transaction.id,
      open: true,
      session: previous.session + 1,
    }));
  }

  function closeSheet() {
    setSheet((previous) => ({ ...previous, open: false }));
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

  // The props that make a part of the dashboard fade and rise into place,
  // `order` steps after the first. With playEntrance false, `initial` is
  // false and it's simply there.
  const appear = (order: number) => ({
    variants: fadeRise,
    custom: order,
    initial: playEntrance ? ("hidden" as const) : false,
    animate: "shown" as const,
  });

  return (
    <>
      {/* Room at the bottom on phones, so the floating Add button never
          covers the last transaction. */}
      <div className={`${dashboardGridClass} pb-24 sm:pb-0`}>
        <section
          aria-label={`Summary for ${monthName}`}
          className={`space-y-4 ${dashboardSummaryArea}`}
        >
          <m.div {...appear(0)}>
            <AccountBalanceCard
              transactions={transactions}
              openingBalance={settings.openingBalance}
              today={today}
            />
          </m.div>
          <m.div {...appear(1)}>
            <MonthPicker
              month={month}
              currentMonth={currentMonth}
              onChange={setPickedMonth}
            />
          </m.div>
          <m.div {...appear(2)}>
            <MonthSummary
              totals={totalsByCurrency(monthTransactions, settings.currency)}
            />
          </m.div>
        </section>

        <m.section
          {...appear(3)}
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
              editingId={sheetOpen && editing ? editing.id : null}
              onEdit={openEdit}
            />
          </div>

          <p className="mt-3 text-sm text-muted">
            Saved in this browser on this device only. Clearing your browser
            data deletes them.
          </p>
        </m.section>

        {/* After the list on phones; under the summary on large screens.
            On phones they're below the fold, so they appear as they're
            scrolled to, once; on large screens they're already in view. */}
        <m.div
          variants={fadeRise}
          initial={playEntrance ? "hidden" : false}
          whileInView="shown"
          viewport={{ once: true, amount: 0.15 }}
          className={`space-y-4 ${dashboardChartsArea}`}
        >
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
        </m.div>
      </div>

      {/* On phones, Add floats in the bottom corner, within thumb's reach. */}
      <button
        type="button"
        onClick={openAdd}
        aria-label="Add transaction"
        className={`fixed right-4 bottom-6 z-10 inline-flex h-14 items-center gap-2 rounded-full bg-accent px-6 text-base font-semibold text-accent-foreground shadow-lg hover:opacity-90 sm:hidden ${pressable}`}
      >
        <span aria-hidden="true" className="text-2xl leading-none">
          +
        </span>
        Add
      </button>

      <Sheet
        open={sheetOpen}
        title={sheet.kind === "edit" ? "Edit transaction" : "Add a transaction"}
        onClose={closeSheet}
        fallbackFocusRef={listHeadingRef}
      >
        {/* A new key on every opening makes React start a fresh form. If the
            edited transaction was just deleted, there's nothing to show while
            the sheet slides away. */}
        {hasContent && (
          <TransactionForm
            key={sheet.session}
            transaction={editing}
            defaultCurrency={settings.currency}
            onSave={save}
            onCancel={closeSheet}
            onDelete={editing ? () => remove(editing) : undefined}
          />
        )}
      </Sheet>
    </>
  );
}
