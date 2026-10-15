"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  cardClass,
  fieldClass,
  pressable,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/formStyles";
import { Sheet } from "@/components/Sheet";
import { Toast } from "@/components/Toast";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { useTransactionEditor } from "@/components/useTransactionEditor";
import {
  useAccountPreferences,
  useAccounts,
  useAccountSettings,
  useAccountStatus,
  useAccountTransactions,
  useCategories,
} from "@/lib/accountData";
import { CATEGORY_KIND_LABELS } from "@/lib/categories";
import { formatMoney } from "@/lib/money";
import { totalsByCurrency } from "@/lib/summary";
import {
  activeFilterCount,
  allTags,
  applyFilters,
  filtersFromQuery,
  filtersToQuery,
  firstPart,
  isFiltered,
  NO_FILTERS,
  type SortOrder,
  type TransactionFilters,
} from "@/lib/transactionFilters";
import type { TransactionType } from "@/lib/transactions";
import { useToday } from "@/lib/useToday";

/** How many transactions show at first, and how many more each time. */
const PAGE_SIZE = 50;

const SORT_LABELS: Record<SortOrder, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  largest: "Largest amount",
  smallest: "Smallest amount",
};

const labelClass = "block text-sm font-medium";

/**
 * The Transactions page: every transaction, with search, filters and
 * sorting (PRD 7.5), shown a part at a time. The filters live in the
 * address bar, so a reload keeps them. A row opens the same sheet as on
 * the dashboard, to edit or delete it.
 */
export function TransactionsBrowser() {
  const status = useAccountStatus();
  const settings = useAccountSettings();
  const accounts = useAccounts();
  const categories = useCategories();
  const preferences = useAccountPreferences();
  const transactions = useAccountTransactions();
  const today = useToday();
  const editor = useTransactionEditor(transactions);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Read from the address once; after that the page keeps it up to date.
  const [filters, setFilters] = useState<TransactionFilters>(() =>
    filtersFromQuery(new URLSearchParams(searchParams.toString())),
  );
  const [limit, setLimit] = useState(PAGE_SIZE);
  // On phones the filters fold away behind a button; from lg they show.
  const [showFilters, setShowFilters] = useState(false);
  const filtersId = useId();
  const listHeadingRef = useRef<HTMLHeadingElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // replaceState, not a navigation: the page doesn't reload, and the Back
  // button isn't filled with every letter typed in the search.
  useEffect(() => {
    window.history.replaceState(null, "", `${pathname}${filtersToQuery(filters)}`);
  }, [filters, pathname]);

  function update(change: Partial<TransactionFilters>) {
    setFilters((previous) => ({ ...previous, ...change }));
    setLimit(PAGE_SIZE);
  }

  if (status === "unconfirmed") {
    return (
      <p role="alert" className={`${cardClass} max-w-lg p-4 text-sm text-danger sm:p-6`}>
        Pocketwise&apos;s server couldn&apos;t confirm your sign-in, so your
        data can&apos;t be shown. Try signing out and back in.
      </p>
    );
  }
  if (
    settings === null ||
    transactions === null ||
    accounts === null ||
    categories === null ||
    preferences === null
  ) {
    return <p className="text-sm text-muted">Loading your transactions…</p>;
  }
  if (settings.currency === null) {
    return (
      <p className="text-sm text-muted">
        Choose your currency on the{" "}
        <Link href="/" className="font-medium text-foreground underline">
          dashboard
        </Link>{" "}
        first.
      </p>
    );
  }

  const mainCurrency = settings.currency;
  const results = applyFilters(transactions, filters, mainCurrency);
  const order = filters.sort === "largest" || filters.sort === "smallest" ? "flat" : filters.sort;
  const shown = firstPart(results, limit, order !== "flat");
  const totals = totalsByCurrency(results, mainCurrency).filter(
    (t) => t.incomeMinor !== 0 || t.spendingMinor !== 0,
  );
  const tags = allTags(transactions);
  const filterCount = activeFilterCount(filters);
  const narrowed = isFiltered(filters);
  const accountNames = new Map(accounts.map((a) => [a.id, a.name]));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Transactions</h1>
        <div className="hidden sm:block">
          <button type="button" onClick={editor.openAdd} className={primaryButtonClass}>
            <span aria-hidden="true" className="mr-1.5 text-lg leading-none">+</span>
            Add transaction
          </button>
        </div>
      </div>

      <section aria-label="Search and filters" className={`${cardClass} mt-6 p-4 sm:p-6`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className={`${labelClass} flex-1`}>
            Search
            <span className="relative block">
              <Search
                size={18}
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 mt-0.5 -translate-y-1/2 text-muted"
              />
              <input
                type="search"
                autoComplete="off"
                placeholder="Description, note, category, tag or amount"
                ref={searchRef}
                value={filters.search}
                onChange={(event) => update({ search: event.target.value })}
                className={`${fieldClass} pl-10`}
              />
            </span>
          </label>
          <button
            type="button"
            aria-expanded={showFilters}
            aria-controls={filtersId}
            onClick={() => setShowFilters((open) => !open)}
            className={`${secondaryButtonClass} gap-2 lg:hidden`}
          >
            <SlidersHorizontal size={18} aria-hidden="true" />
            {filterCount > 0 ? `Filters (${filterCount})` : "Filters"}
          </button>
        </div>

        <div
          id={filtersId}
          className={`${showFilters ? "grid" : "hidden"} mt-4 gap-4 sm:grid-cols-2 lg:grid lg:grid-cols-4`}
        >
          <label className={labelClass}>
            Type
            <select
              value={filters.type}
              onChange={(event) => update({ type: event.target.value as TransactionType | "all" })}
              className={fieldClass}
            >
              <option value="all">All types</option>
              <option value="expense">Expenses</option>
              <option value="income">Income</option>
              <option value="transfer">Transfers</option>
            </select>
          </label>

          <label className={labelClass}>
            Account
            <select
              value={filters.accountId ?? ""}
              onChange={(event) => update({ accountId: event.target.value || null })}
              className={fieldClass}
            >
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency}){a.archived ? ", archived" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            Category
            <select
              value={filters.categoryId ?? ""}
              onChange={(event) => update({ categoryId: event.target.value || null })}
              className={fieldClass}
            >
              <option value="">All categories</option>
              {(["expense", "income"] as const).map((kind) => (
                <optgroup key={kind} label={CATEGORY_KIND_LABELS[kind]}>
                  {categories
                    .filter((c) => c.kind === kind)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.archived ? ", archived" : ""}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            Tag
            <select
              value={filters.tag ?? ""}
              onChange={(event) => update({ tag: event.target.value || null })}
              disabled={tags.length === 0 && !filters.tag}
              className={fieldClass}
            >
              <option value="">{tags.length === 0 ? "No tags yet" : "All tags"}</option>
              {/* A tag from the address that no transaction has any more. */}
              {filters.tag && !tags.includes(filters.tag) && <option value={filters.tag}>{filters.tag}</option>}
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            From
            <input
              type="date"
              value={filters.from ?? ""}
              max={filters.to ?? undefined}
              onChange={(event) => update({ from: event.target.value || null })}
              className={fieldClass}
            />
          </label>

          <label className={labelClass}>
            To
            <input
              type="date"
              value={filters.to ?? ""}
              min={filters.from ?? undefined}
              onChange={(event) => update({ to: event.target.value || null })}
              className={fieldClass}
            />
          </label>

          <label className={labelClass}>
            Sort by
            <select
              value={filters.sort}
              onChange={(event) => update({ sort: event.target.value as SortOrder })}
              className={fieldClass}
            >
              {(Object.keys(SORT_LABELS) as SortOrder[]).map((sort) => (
                <option key={sort} value={sort}>
                  {SORT_LABELS[sort]}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                update({ ...NO_FILTERS, sort: filters.sort });
                // The button turns off once there's nothing to clear, which
                // would drop keyboard focus; the search is where to start again.
                searchRef.current?.focus();
              }}
              disabled={!narrowed}
              className={`${secondaryButtonClass} disabled:opacity-50`}
            >
              Clear filters
            </button>
          </div>
        </div>
      </section>

      {editor.saveFailed && (
        <p
          role="alert"
          className="mt-6 rounded-control border border-danger-line bg-danger-surface px-4 py-3 text-sm text-danger"
        >
          Pocketwise couldn&apos;t save your last change to your account, so
          it was undone on screen. Check your connection and try again.
        </p>
      )}

      {/* The results, in one card: how many and their totals, then the list. */}
      <section aria-labelledby="results-heading" className={`${cardClass} mt-6 p-4 sm:p-6`}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          {/* tabIndex -1: where focus goes after a delete removes the row. */}
          <h2 id="results-heading" ref={listHeadingRef} tabIndex={-1} className="text-lg font-semibold">
            {narrowed ? "Results" : "All transactions"}
          </h2>
          <p className="text-sm text-muted">{results.length === 1 ? "1 transaction" : `${results.length} transactions`}</p>
        </div>
        {/* Announced as the results change: the totals, a row of three per
            currency. */}
        <div role="status" className="mt-4 space-y-3">
          {totals.map((t) => (
            <dl key={t.currency} className="grid grid-cols-3 gap-2 sm:gap-3">
              <Total label="Income" tone="text-positive" amount={formatMoney({ amountMinor: t.incomeMinor, currency: t.currency })} />
              <Total label="Spending" amount={formatMoney({ amountMinor: t.spendingMinor, currency: t.currency })} />
              <Total
                label="Net"
                tone={t.balanceMinor < 0 ? "text-danger" : undefined}
                amount={formatMoney({ amountMinor: t.balanceMinor, currency: t.currency })}
              />
            </dl>
          ))}
          {results.some((t) => t.type === "transfer") && (
            <p className="text-xs text-muted">
              Transfers move money between your accounts, so they aren&apos;t counted as income or spending.
            </p>
          )}
        </div>

        {/* A new key when the order changes, so the list is drawn afresh
            rather than animating every row into its new place. */}
        <div className="mt-5">
          <TransactionList
            key={filters.sort}
            transactions={shown}
            emptyMessage={
              transactions.length === 0
                ? "No transactions yet. Use the Add button to record your first one."
                : "No transactions match. Try other words, or clear the filters."
            }
            today={today}
            dateOrder={preferences.dateOrder}
            editingId={editor.sheetOpen && editor.editing ? editor.editing.id : null}
            onEdit={editor.openEdit}
            accountNames={accountNames}
            showAccounts={accounts.filter((a) => !a.archived).length > 1}
            order={order}
            inCard
          />
        </div>

        {shown.length < results.length && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <p className="text-sm text-muted">
              Showing {shown.length} of {results.length}
            </p>
            <button
              type="button"
              onClick={() => setLimit((current) => current + PAGE_SIZE)}
              className={secondaryButtonClass}
            >
              Show {Math.min(PAGE_SIZE, results.length - shown.length)} more
            </button>
          </div>
        )}
      </section>

      {/* On phones, Add floats in the bottom corner, as on the dashboard. */}
      <button
        type="button"
        onClick={editor.openAdd}
        aria-label="Add transaction"
        className={`fixed right-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-10 inline-flex h-14 items-center gap-2 rounded-full bg-accent px-6 text-base font-semibold text-accent-foreground shadow-lg hover:opacity-90 sm:hidden ${pressable}`}
      >
        <span aria-hidden="true" className="text-2xl leading-none">
          +
        </span>
        Add
      </button>

      <Toast notice={editor.notice} />

      <Sheet
        open={editor.sheetOpen}
        title={editor.sheet.kind === "edit" ? "Edit transaction" : "Add a transaction"}
        onClose={editor.closeSheet}
        fallbackFocusRef={listHeadingRef}
      >
        {editor.hasContent && (
          <TransactionForm
            key={editor.sheet.session}
            transaction={editor.editing}
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

/** One of the results' totals: a small label over the amount. */
function Total({ label, amount, tone }: { label: string; amount: string; tone?: string }) {
  return (
    <div className="min-w-0 rounded-control bg-surface-muted px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`text-sm font-semibold tabular-nums [overflow-wrap:anywhere] sm:text-base ${tone ?? ""}`}>{amount}</dd>
    </div>
  );
}
