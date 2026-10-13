import { formatMoney } from "@/lib/money";
import { signedAmount, type Transaction } from "@/lib/transactions";

type Props = {
  transactions: Transaction[];
};

export function TransactionList({ transactions }: Props) {
  if (transactions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
        No transactions yet. Add your first one with the form above.
      </p>
    );
  }

  // "YYYY-MM-DD" dates sort correctly as plain text, so newest first is a
  // simple text comparison.
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {sorted.map((transaction) => (
        <li
          key={transaction.id}
          className="flex items-center justify-between gap-4 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="font-medium">{transaction.category}</p>
            <p className="truncate text-sm text-zinc-500">
              {transaction.date}
              {transaction.note && ` · ${transaction.note}`}
            </p>
          </div>
          <p
            className={`shrink-0 font-medium tabular-nums ${
              transaction.type === "income"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-zinc-900 dark:text-zinc-100"
            }`}
          >
            {formatMoney(signedAmount(transaction))}
          </p>
        </li>
      ))}
    </ul>
  );
}
