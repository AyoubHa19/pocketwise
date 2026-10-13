import { cardClass } from "@/components/formStyles";
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
        <Total label="Income" value={money(main.incomeMinor)} tone="positive" />
        <Total label="Spending" value={money(main.spendingMinor)} />
        <Total
          label="Balance"
          value={money(main.balanceMinor)}
          tone={main.balanceMinor < 0 ? "negative" : undefined}
        />
      </dl>

      {others.length > 0 && (
        <div className="mt-3 text-sm text-muted">
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

// Red is kept for things that need attention, like spending more than came
// in, so ordinary spending stays in the main text colour.
const toneClass = {
  positive: "text-positive",
  negative: "text-danger",
};

function Total({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: keyof typeof toneClass;
}) {
  return (
    <div
      className={`${cardClass} flex items-baseline justify-between gap-4 px-4 py-3 sm:block sm:px-5 sm:py-4`}
    >
      <dt className="text-sm text-muted">{label}</dt>
      <dd
        className={`text-lg font-semibold tabular-nums sm:mt-1 sm:text-2xl ${
          tone ? toneClass[tone] : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
