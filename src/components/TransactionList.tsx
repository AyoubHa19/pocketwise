"use client";

import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { CategoryIcon } from "@/components/CategoryIcon";
import { cardClass, colorTransition } from "@/components/formStyles";
import { DEFAULT_PREFERENCES, formatDay, type DateOrder } from "@/lib/preferences";
import { formatMoney } from "@/lib/money";
import { collapse } from "@/lib/motion";
import { groupByDay } from "@/lib/summary";
import { signedAmount, type Transaction } from "@/lib/transactions";

type Props = {
  transactions: Transaction[];
  /** What to say when there are no transactions to show. */
  emptyMessage: string;
  /** Today's date, for the "Today" and "Yesterday" headings. */
  today: string;
  /** Writes the day headings in the user's date format (13 Oct, Oct 13, 13/10/2026). */
  dateOrder?: DateOrder;
  /** The transaction open in the sheet, highlighted in the list. */
  editingId: string | null;
  onEdit: (transaction: Transaction) => void;
  /** Account names by id, to say where each transaction happened. */
  accountNames?: Map<string, string>;
  /** Name the account on every row: worth it once there's more than one. */
  showAccounts?: boolean;
  /**
   * Grouped by day, newest day first (the default) or oldest first, or
   * "flat": in the order given, with no day headings, each row saying its
   * day (for sorting by amount).
   */
  order?: "newest" | "oldest" | "flat";
};

/**
 * The transactions, grouped by day, newest first (or as `order` says). Tap
 * a row to edit it.
 *
 * Rows and days that are added or removed grow in or shrink away, so the
 * rest of the list makes room smoothly. Only those move: what's already
 * there when the list appears (including after changing month) is simply
 * shown, which keeps long lists calm.
 */
export function TransactionList({
  transactions,
  emptyMessage,
  today,
  dateOrder = DEFAULT_PREFERENCES.dateOrder,
  editingId,
  onEdit,
  accountNames,
  showAccounts = false,
  order = "newest",
}: Props) {
  const reduced = useReducedMotion() ?? false;
  const variants = collapse(reduced);

  if (transactions.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">
        {emptyMessage}
      </p>
    );
  }

  /** One transaction's row; `showDates` adds its day, for the list without day headings. */
  function row(transaction: Transaction, showDates: boolean) {
    const amount = formatMoney(signedAmount(transaction));
    const isTransfer = transaction.type === "transfer";
    const name = (id?: string) => (id && accountNames?.get(id)) || "Another account";
    // Where it happened: a transfer's two ends, or the
    // account, when there's more than one to tell apart.
    const where = isTransfer
      ? `${name(transaction.accountId)} → ${name(transaction.toAccountId)}`
      : showAccounts && transaction.accountId
        ? name(transaction.accountId)
        : undefined;
    // With a description, it's the title ("Supermarket") and
    // the category moves down with the details.
    const title = transaction.description ?? transaction.category;
    const details = [
      // Without day headings, each row says its day.
      showDates && formatDay(transaction.date, today, dateOrder),
      transaction.description && transaction.category,
      where,
      transaction.note,
    ]
      .filter(Boolean)
      .join(" · ");
    const tags = transaction.tags ?? [];
    // Spelled out, with commas for pauses, rather than left to
    // each screen reader to piece together from the row's
    // text, which some read as "FoodCoffee". It holds the
    // visible words in order, so voice control ("click Food")
    // still works.
    const label = [
      `Edit ${title}`,
      showDates && formatDay(transaction.date, today, dateOrder),
      transaction.description && transaction.category,
      where?.replace(" → ", " to "),
      transaction.note,
      tags.length > 0 && `tags: ${tags.join(", ")}`,
      amount,
    ]
      .filter(Boolean)
      .join(", ");
    return (
      <m.li
        key={transaction.id}
        variants={variants}
        initial="collapsed"
        animate="open"
        exit="collapsed"
        className="overflow-hidden"
      >
        {/* The whole row is the button: a big target, and
            what people expect from a finance app. The focus
            outline is drawn inside it, because the rounded
            card clips anything outside. */}
        <button
          type="button"
          aria-label={label}
          onClick={() => onEdit(transaction)}
          className={`flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted focus-visible:outline-offset-[-3px] ${colorTransition} ${
            transaction.id === editingId ? "bg-surface-muted" : ""
          }`}
        >
          <CategoryIcon category={transaction.category} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">
              {title}
            </span>
            {details && (
              <span className="block truncate text-sm text-muted">
                {details}
              </span>
            )}
            {tags.length > 0 && (
              // One line, so a row never grows tall on a phone;
              // tags that don't fit are cut off at the edge (all
              // of them are in the row's label, and in the form).
              <span className="mt-1 flex gap-1 overflow-hidden">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="max-w-full shrink-0 truncate rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </span>
            )}
          </span>
          <span
            // Income green; a transfer muted and unsigned, since
            // it doesn't change what you have overall.
            className={`shrink-0 font-medium tabular-nums ${
              transaction.type === "income"
                ? "text-positive"
                : isTransfer
                  ? "text-muted"
                  : ""
            }`}
          >
            <AnimatedNumber
              text={amount}
              value={signedAmount(transaction).amountMinor}
            />
          </span>
        </button>
      </m.li>
    );
  }

  if (order === "flat") {
    return (
      <ul className={`${cardClass} divide-y divide-line overflow-hidden`}>
        <AnimatePresence initial={false}>
          {transactions.map((transaction) => row(transaction, true))}
        </AnimatePresence>
      </ul>
    );
  }

  // Oldest first: the days, and each day's transactions, turned round.
  const days =
    order === "oldest" ? groupByDay([...transactions].reverse()).reverse() : groupByDay(transactions);

  return (
    // Each day keeps its own space below (pb-6) instead of the list putting
    // gaps between days, so a day can shrink to nothing without a gap
    // snapping shut afterwards. -mb-6 takes back the last day's space.
    <div className="-mb-6">
      <AnimatePresence initial={false}>
        {days.map((day) => {
          const headingId = `day-${day.date}`;
          const dayNet = day.netByCurrency
            .map(({ currency, netMinor }) =>
              formatMoney({ amountMinor: netMinor, currency }),
            )
            .join(" · ");

          return (
            <m.section
              key={day.date}
              variants={variants}
              initial="collapsed"
              animate="open"
              exit="collapsed"
              aria-labelledby={headingId}
              className="overflow-hidden pb-6"
            >
              <div className="mb-2 flex items-baseline justify-between gap-4 px-1">
                <h3 id={headingId} className="text-sm font-semibold text-muted">
                  {formatDay(day.date, today, dateOrder)}
                </h3>
                <p className="text-sm tabular-nums text-muted">
                  <span className="sr-only">Total for the day: </span>
                  <AnimatedNumber
                    text={dayNet}
                    value={day.netByCurrency[0]?.netMinor ?? 0}
                  />
                </p>
              </div>

              {/* overflow-hidden keeps the row highlight inside the corners. */}
              <ul className={`${cardClass} divide-y divide-line overflow-hidden`}>
                <AnimatePresence initial={false}>
                  {day.transactions.map((transaction) => row(transaction, false))}
                </AnimatePresence>
              </ul>
            </m.section>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
