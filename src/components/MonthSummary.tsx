import { fitOneLine } from "@/components/fitOneLine";
import { cardClass } from "@/components/formStyles";
import { formatMoney } from "@/lib/money";
import { percentOfIncomeSpent, type CurrencyTotals } from "@/lib/summary";

type Props = {
  /** From totalsByCurrency: the main currency first, then any others. */
  totals: CurrencyTotals[];
};


/**
 * The month at a glance: the balance large, since it's what people look
 * for first, then income and spending, and how much of the income is gone.
 */
export function MonthSummary({ totals }: Props) {
  const [main, ...others] = totals;
  const money = (amountMinor: number, currency = main.currency) =>
    formatMoney({ amountMinor, currency });
  const spentPercent = percentOfIncomeSpent(main);
  const overspent = main.balanceMinor < 0;
  const balance = money(main.balanceMinor);
  const income = money(main.incomeMinor);
  const spending = money(main.spendingMinor);

  return (
    <div className={`${cardClass} p-5 sm:p-6`}>
      <dl className="@container">
        {/* @container makes this box the one that 100cqi measures. */}
        <div className="@container">
          {/* Not "Balance": that reads as the money in the bank, which is
              the Account balance card's job. */}
          <dt className="text-sm font-medium text-muted">Left this month</dt>
          {/* Normal size per layout (--balance-max), smaller for long
              amounts so they stay on one line. The line height is fixed so
              shrinking never moves anything below. overflow-wrap is only a
              last resort for amounts too long even at the minimum size. */}
          <dd
            className={`mt-1 leading-9 font-semibold tracking-tight tabular-nums [--balance-max:1.875rem] [overflow-wrap:anywhere] sm:leading-12 sm:[--balance-max:3rem] lg:leading-10 lg:[--balance-max:2.25rem] ${
              overspent ? "text-danger" : ""
            }`}
            style={fitOneLine(balance, "1.25rem", "var(--balance-max)")}
          >
            {balance}
          </dd>
        </div>

        {/* Side by side once the card is at least 18rem wide inside;
            stacked on the smallest phones, where half a card is too narrow
            for a long amount. */}
        <div className="mt-5 grid gap-4 border-t border-line pt-4 @2xs:grid-cols-2">
          <div className="min-w-0 @container">
            <dt className="text-sm text-muted">Income</dt>
            <dd
              className="mt-0.5 leading-7 font-semibold tabular-nums text-positive [overflow-wrap:anywhere]"
              style={fitOneLine(income, "0.875rem", "1.125rem")}
            >
              {income}
            </dd>
          </div>
          <div className="min-w-0 @container">
            <dt className="text-sm text-muted">Spending</dt>
            <dd
              className="mt-0.5 leading-7 font-semibold tabular-nums [overflow-wrap:anywhere]"
              style={fitOneLine(spending, "0.875rem", "1.125rem")}
            >
              {spending}
            </dd>
          </div>
        </div>
      </dl>

      {/* With no income yet, what's "left" is just minus the spending,
          which alarms people who haven't entered their pay. Say why. */}
      {/* mt-8 makes it as tall as the bar and its sentence (16 + 8 + 8 +
          20px), so adding the first income moves nothing below. */}
      {spentPercent === null && (
        <p className="mt-8 text-sm text-muted">
          Add this month&apos;s income to see what&apos;s left.
        </p>
      )}

      {spentPercent !== null && (
        <div className="mt-4">
          {/* The bar is a picture of the sentence under it, so screen
              readers get the sentence only. */}
          <div
            aria-hidden="true"
            className="h-2 overflow-hidden rounded-full bg-surface-muted"
          >
            <div
              className={`h-full rounded-full ${
                spentPercent > 100 ? "bg-danger" : "bg-accent"
              }`}
              style={{ width: `${Math.min(spentPercent, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-muted">
            {spentPercent}% of income spent
          </p>
        </div>
      )}

      {others.length > 0 && (
        <div className="mt-4 border-t border-line pt-4 text-sm text-muted">
          <p>Not included above, because they&apos;re in other currencies:</p>
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
