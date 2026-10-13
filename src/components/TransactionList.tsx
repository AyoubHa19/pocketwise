import { cardClass, textButtonClass } from "@/components/formStyles";
import { formatMoney } from "@/lib/money";
import { signedAmount, type Transaction } from "@/lib/transactions";

type Props = {
  transactions: Transaction[];
  /** What to say when there are no transactions to show. */
  emptyMessage: string;
  /** The transaction open in the form, highlighted in the list. */
  editingId: string | null;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
};

export function TransactionList({
  transactions,
  emptyMessage,
  editingId,
  onEdit,
  onDelete,
}: Props) {
  if (transactions.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">
        {emptyMessage}
      </p>
    );
  }

  // "YYYY-MM-DD" dates sort correctly as plain text, so newest first is a
  // simple text comparison.
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    // overflow-hidden keeps the highlighted row inside the rounded corners.
    <ul className={`${cardClass} divide-y divide-line overflow-hidden`}>
      {sorted.map((transaction) => {
        // Every row has the same two buttons, so screen readers need to hear
        // which transaction each one is for.
        const label = `${transaction.category}, ${transaction.date}`;
        return (
          <li
            key={transaction.id}
            className={`flex items-start justify-between gap-4 px-4 py-3 ${
              transaction.id === editingId ? "bg-surface-muted" : ""
            }`}
          >
            <div className="min-w-0">
              <p className="font-medium">{transaction.category}</p>
              <p className="truncate text-sm text-muted">
                {transaction.date}
                {transaction.note && ` · ${transaction.note}`}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end">
              <p
                className={`font-medium tabular-nums ${
                  transaction.type === "income" ? "text-positive" : ""
                }`}
              >
                {formatMoney(signedAmount(transaction))}
              </p>
              <div className="-mr-3 flex">
                <button
                  type="button"
                  onClick={() => onEdit(transaction)}
                  aria-label={`Edit ${label}`}
                  className={`${textButtonClass} hover:text-foreground`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(transaction)}
                  aria-label={`Delete ${label}`}
                  className={`${textButtonClass} hover:text-danger`}
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
