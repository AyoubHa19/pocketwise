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

// 44px tall and wide at least, so a finger can't easily hit the wrong one.
const actionClass =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800";

export function TransactionList({
  transactions,
  emptyMessage,
  editingId,
  onEdit,
  onDelete,
}: Props) {
  if (transactions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
        {emptyMessage}
      </p>
    );
  }

  // "YYYY-MM-DD" dates sort correctly as plain text, so newest first is a
  // simple text comparison.
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {sorted.map((transaction) => {
        // Every row has the same two buttons, so screen readers need to hear
        // which transaction each one is for.
        const label = `${transaction.category}, ${transaction.date}`;
        return (
          <li
            key={transaction.id}
            className={`flex items-start justify-between gap-4 px-4 py-3 ${
              transaction.id === editingId ? "bg-zinc-100 dark:bg-zinc-900" : ""
            }`}
          >
            <div className="min-w-0">
              <p className="font-medium">{transaction.category}</p>
              <p className="truncate text-sm text-zinc-500">
                {transaction.date}
                {transaction.note && ` · ${transaction.note}`}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end">
              <p
                className={`font-medium tabular-nums ${
                  transaction.type === "income"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-zinc-900 dark:text-zinc-100"
                }`}
              >
                {formatMoney(signedAmount(transaction))}
              </p>
              <div className="-mr-3 flex">
                <button
                  type="button"
                  onClick={() => onEdit(transaction)}
                  aria-label={`Edit ${label}`}
                  className={`${actionClass} hover:text-zinc-900 dark:hover:text-zinc-100`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(transaction)}
                  aria-label={`Delete ${label}`}
                  className={`${actionClass} hover:text-red-700 dark:hover:text-red-400`}
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
