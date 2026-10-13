import { formatMoney } from "@/lib/money";
import type { CurrencyTotals } from "@/lib/summary";

type Props = {
  /** From totalsByCurrency: the main currency first, then any others. */
  totals: CurrencyTotals[];
};

export function MonthSummary({ totals }: Props) {
  const [main, ...others] = totals;
  const money = (amountMinor: number, currency = main.currency) =>
    formatMoney({ amountMinor, currency });

  return (
    <div>
      {/* On phones each total is a row; from the sm breakpoint, a card. */}
      <dl className="grid gap-3 sm:grid-cols-3">
        <Total label="Income" value={money(main.incomeMinor)} income />
        <Total label="Spending" value={money(main.spendingMinor)} />
        <Total label="Balance" value={money(main.balanceMinor)} />
      </dl>

      {others.length > 0 && (
        <div className="mt-3 text-sm text-zinc-500">
          <p>
            Not included above, because they&apos;re in other currencies:
          </p>
          <ul className="mt-1">
            {others.map((entry) => (
              <li key={entry.currency} className="tabular-nums">
                {entry.currency}: {money(entry.incomeMinor, entry.currency)}{" "}
                in, {money(entry.spendingMinor, entry.currency)} out
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Total({
  label,
  value,
  income = false,
}: {
  label: string;
  value: string;
  income?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 rounded-lg border border-zinc-200 px-4 py-3 sm:block dark:border-zinc-800">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd
        className={`text-lg font-semibold tabular-nums sm:mt-1 sm:text-2xl ${
          income ? "text-emerald-600 dark:text-emerald-400" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
