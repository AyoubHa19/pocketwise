import { CategoryIcon } from "@/components/CategoryIcon";
import { cardClass } from "@/components/formStyles";
import { formatDayLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { groupByDay } from "@/lib/summary";
import { signedAmount, type Transaction } from "@/lib/transactions";

type Props = {
  transactions: Transaction[];
  /** What to say when there are no transactions to show. */
  emptyMessage: string;
  /** Today's date, for the "Today" and "Yesterday" headings. */
  today: string;
  /** The transaction open in the sheet, highlighted in the list. */
  editingId: string | null;
  onEdit: (transaction: Transaction) => void;
};

/** The transactions, grouped by day, newest first. Tap a row to edit it. */
export function TransactionList({
  transactions,
  emptyMessage,
  today,
  editingId,
  onEdit,
}: Props) {
  if (transactions.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {groupByDay(transactions).map((day) => {
        const headingId = `day-${day.date}`;
        const dayNet = day.netByCurrency
          .map(({ currency, netMinor }) =>
            formatMoney({ amountMinor: netMinor, currency }),
          )
          .join(" · ");

        return (
          <section key={day.date} aria-labelledby={headingId}>
            <div className="mb-2 flex items-baseline justify-between gap-4 px-1">
              <h3 id={headingId} className="text-sm font-semibold text-muted">
                {formatDayLabel(day.date, today)}
              </h3>
              <p className="text-sm tabular-nums text-muted">
                <span className="sr-only">Total for the day: </span>
                {dayNet}
              </p>
            </div>

            {/* overflow-hidden keeps the row highlight inside the corners. */}
            <ul className={`${cardClass} divide-y divide-line overflow-hidden`}>
              {day.transactions.map((transaction) => {
                const amount = formatMoney(signedAmount(transaction));
                // Spelled out, with commas for pauses, rather than left to
                // each screen reader to piece together from the row's text,
                // which some read as "FoodCoffee". It holds the visible
                // words in order, so voice control ("click Food") still works.
                const label = [
                  `Edit ${transaction.category}`,
                  transaction.note,
                  amount,
                ]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <li key={transaction.id}>
                    {/* The whole row is the button: a big target, and what
                        people expect from a finance app. */}
                    <button
                      type="button"
                      aria-label={label}
                      onClick={() => onEdit(transaction)}
                      className={`flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted ${
                        transaction.id === editingId ? "bg-surface-muted" : ""
                      }`}
                    >
                      <CategoryIcon category={transaction.category} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">
                          {transaction.category}
                        </span>
                        {transaction.note && (
                          <span className="block truncate text-sm text-muted">
                            {transaction.note}
                          </span>
                        )}
                      </span>
                      <span
                        className={`shrink-0 font-medium tabular-nums ${
                          transaction.type === "income" ? "text-positive" : ""
                        }`}
                      >
                        {amount}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
