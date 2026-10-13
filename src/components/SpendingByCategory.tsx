import { CategoryIcon } from "@/components/CategoryIcon";
import { cardClass } from "@/components/formStyles";
import { formatMoney } from "@/lib/money";
import type { CategorySpending } from "@/lib/summary";

type Props = {
  /** From spendingByCategory: biggest first. */
  categories: CategorySpending[];
  currency: string;
  monthName: string;
};

/**
 * Where the month's money went. It's a plain list, so screen readers read
 * each line ("Rent, AED 500.00, 63%") with no separate text version. Each
 * bar is the category's share of all spending, matching the number beside
 * it, in one colour: the name, icon and figures already tell them apart.
 */
export function SpendingByCategory({ categories, currency, monthName }: Props) {
  return (
    <section
      aria-labelledby="by-category-heading"
      className={`${cardClass} p-5 sm:p-6`}
    >
      <h2 id="by-category-heading" className="font-semibold">
        Spending by category
      </h2>

      {categories.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No spending in {monthName}.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {categories.map(({ category, amountMinor, percent }) => (
            <li key={category} className="flex items-center gap-3">
              <CategoryIcon category={category} small />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-medium">{category}</span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatMoney({ amountMinor, currency })}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-3">
                  <div
                    aria-hidden="true"
                    className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted"
                  >
                    {/* At least 1%, so a tiny category still shows a sliver. */}
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.max(percent, 1)}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-sm text-muted tabular-nums">
                    {percent}%
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
