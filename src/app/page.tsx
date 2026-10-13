import { formatMoney } from "@/lib/money";
import { signedAmount, type Transaction } from "@/lib/transactions";

// Example data only, to show how amounts are displayed. Real
// transactions will come from the user once we add a form.
const sampleTransactions: Transaction[] = [
  {
    id: "1",
    type: "income",
    amount: { amountMinor: 250000, currency: "USD" },
    category: "Salary",
    date: "2026-10-01",
  },
  {
    id: "2",
    type: "expense",
    amount: { amountMinor: 1999, currency: "USD" },
    category: "Food",
    date: "2026-10-03",
    note: "Groceries",
  },
  {
    id: "3",
    type: "expense",
    amount: { amountMinor: 2000, currency: "JPY" },
    category: "Transport",
    date: "2026-10-05",
    note: "Train ticket",
  },
  {
    id: "4",
    type: "expense",
    amount: { amountMinor: 45050, currency: "MAD" },
    category: "Rent",
    date: "2026-10-06",
  },
];

export default function Home() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Welcome to Pocketwise
      </h1>
      <p className="mt-4 max-w-prose text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        A simple way to keep track of your income, spending, and budgets.
      </p>

      <h2 className="mt-12 text-lg font-semibold">Example transactions</h2>
      <ul className="mt-4 divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {sampleTransactions.map((transaction) => (
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

      <p className="mt-8 text-sm text-zinc-500">
        Pocketwise is still being built. New features will arrive one step at a
        time.
      </p>
    </section>
  );
}
