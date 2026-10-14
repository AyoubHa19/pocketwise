"use client";

// Motion's own entry point for the light `m` components, which keeps the
// bundle smaller than importing them from "motion/react".
import * as m from "motion/react-m";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BudgetsCard } from "@/components/BudgetsCard";
import { TotalBalanceCard } from "@/components/TotalBalanceCard";
import { CurrencySetup } from "@/components/CurrencySetup";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import {
  cardClass,
  dashboardChartsArea,
  dashboardGridClass,
  dashboardListArea,
  dashboardSummaryArea,
  pressable,
  primaryButtonClass,
  summaryBalanceArea,
  summaryGridClass,
  summaryMonthArea,
  summaryPickerArea,
} from "@/components/formStyles";
import { MonthlyTrend } from "@/components/MonthlyTrend";
import { MonthPicker } from "@/components/MonthPicker";
import { MonthSummary } from "@/components/MonthSummary";
import { Sheet } from "@/components/Sheet";
import { SpendingByCategory } from "@/components/SpendingByCategory";
import { TransactionForm } from "@/components/TransactionForm";
import { Toast } from "@/components/Toast";
import { useTransactionEditor } from "@/components/useTransactionEditor";
import { TransactionList } from "@/components/TransactionList";
import { formatMonth, monthOf } from "@/lib/dates";
import { fadeRise, monthSlide } from "@/lib/motion";
import { LocalDataImport, useLocalDataOffer } from "@/components/LocalDataImport";
import {
  useAccountPreferences,
  useAccounts,
  useCategories,
  useAccountSettings,
  useAccountStatus,
  useAccountTransactions,
  useBudgets,
} from "@/lib/accountData";
import {
  monthlyTotals,
  spendingByCategory,
  totalsByCurrency,
  transactionsInMonth,
} from "@/lib/summary";
import { useToday } from "@/lib/useToday";

// The dashboard's entrance plays once per visit to the site, not again each
// time you come back from Settings, which would get tiresome.
let entrancePlayed = false;

export function TransactionTracker() {
  // From the signed-in user's account.
  const status = useAccountStatus();
  const settings = useAccountSettings();
  const accounts = useAccounts();
  const categories = useCategories();
  const budgets = useBudgets();
  const preferences = useAccountPreferences();
  const transactions = useAccountTransactions();
  // What this browser saved before accounts, if it hasn't been moved yet.
  const localOffer = useLocalDataOffer();
  const today = useToday();
  // null until the user moves to another month; until then, this month.
  const [pickedMonth, setPickedMonth] = useState<string | null>(null);
  // Which way the last month change went: 1 later, -1 earlier, 0 not yet.
  // The new month's content slides in from that side.
  const [monthDirection, setMonthDirection] = useState(0);
  // Show the month a saved transaction is in, or it would seem to vanish
  // when its date is in a different month from the one on screen.
  const {
    sheet,
    editing,
    hasContent,
    sheetOpen,
    saveFailed,
    notice,
    openAdd,
    openEdit,
    closeSheet,
    report,
    save,
    remove,
  } = useTransactionEditor(transactions, (transaction) => changeMonth(monthOf(transaction.date)));
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

  function changeMonth(next: string) {
    // "YYYY-MM" months compare correctly as text.
    if (next !== month) setMonthDirection(next > month ? 1 : -1);
    setPickedMonth(next);
  }

  // Signed in with Clerk, but the server didn't accept it: say so instead
  // of loading forever.
  if (status === "unconfirmed") {
    return (
      <p role="alert" className={`${cardClass} max-w-lg p-4 text-sm text-danger sm:p-6`}>
        Pocketwise&apos;s server couldn&apos;t confirm your sign-in, so your
        data can&apos;t be shown. Try signing out and back in.
      </p>
    );
  }
  // Null while the account and the browser's own data are being read.
  // (Preferences too, so dates don't switch order a moment after showing.)
  if (
    settings === null ||
    transactions === null ||
    preferences === null ||
    accounts === null ||
    categories === null ||
    budgets === null ||
    localOffer === undefined
  ) {
    return <DashboardSkeleton />;
  }
  const account = { settings, transactions };
  const accountIsEmpty =
    transactions.length === 0 &&
    settings.currency === null &&
    settings.openingBalance === null;
  // A new account with data in this browser: offer to move it before
  // asking for a currency, which the old data probably already has.
  if (localOffer && accountIsEmpty) {
    return (
      <>
        <LocalDataImport
          local={localOffer}
          account={account}
          onMoved={(text) => report(true, text)}
        />
        <Toast notice={notice} />
      </>
    );
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
      {/* Old browser data not yet in this (non-empty) account. It hides
          itself when there's nothing left to move. */}
      {localOffer && (
        <LocalDataImport
          local={localOffer}
          account={account}
          onMoved={(text) => report(true, text)}
        />
      )}

      {/* Room at the bottom on phones, so the floating Add button never
          covers the last transaction. */}
      <div className={`${dashboardGridClass} pb-24 sm:pb-0`}>
        <section
          aria-label={`Summary for ${monthName}`}
          className={`${summaryGridClass} ${dashboardSummaryArea}`}
        >
          <m.div {...appear(0)} className={summaryBalanceArea}>
            <TotalBalanceCard
              accounts={accounts}
              transactions={transactions}
              today={today}
              mainCurrency={settings.currency}
            />
          </m.div>
          <m.div {...appear(1)} className={summaryPickerArea}>
            <MonthPicker
              month={month}
              currentMonth={currentMonth}
              direction={monthDirection}
              onChange={changeMonth}
            />
          </m.div>
          <m.div {...appear(2)} className={summaryMonthArea}>
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
              Pocketwise couldn&apos;t save your last change to your account,
              so it was undone on screen. Check your connection and try
              again.
            </p>
          )}

          {/* A new key per month starts a fresh list, which slides in from
              the side you moved to. Within a month the key stays the same,
              so only rows that are added or removed move. */}
          <m.div
            key={month}
            custom={monthDirection}
            variants={monthSlide}
            initial={monthDirection === 0 ? false : "enter"}
            animate="center"
            className="mt-4"
          >
            <TransactionList
              transactions={monthTransactions}
              emptyMessage={
                transactions.length === 0
                  ? "No transactions yet. Use the Add button to record your first one."
                  : `No transactions in ${monthName}.`
              }
              today={today}
              dateOrder={preferences.dateOrder}
              editingId={sheetOpen && editing ? editing.id : null}
              onEdit={openEdit}
              accountNames={new Map(accounts.map((a) => [a.id, a.name]))}
              showAccounts={accounts.filter((a) => !a.archived).length > 1}
            />
          </m.div>

          <p className="mt-3 text-sm text-muted">
            Saved in your account, so you see them wherever you sign in.{" "}
            <Link href="/transactions" className="font-medium text-foreground underline underline-offset-2">
              Search all transactions
            </Link>
          </p>
        </m.section>

        {/* After the list on phones; beside it on large screens. They can
            start below the fold, so they appear as they're scrolled to,
            once. */}
        <m.div
          variants={fadeRise}
          initial={playEntrance ? "hidden" : false}
          whileInView="shown"
          viewport={{ once: true, amount: 0.15 }}
          className={`space-y-4 ${dashboardChartsArea}`}
        >
          <BudgetsCard
            budgets={budgets}
            categories={categories}
            transactions={transactions}
            month={month}
            monthName={monthName}
          />
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

      <Toast notice={notice} />

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
            accounts={accounts}
            categories={categories}
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
