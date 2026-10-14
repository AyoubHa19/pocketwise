import Link from "next/link";
import { BudgetMeter } from "@/components/BudgetMeter";
import { cardClass } from "@/components/formStyles";
import { budgetLabel, budgetProgress, type Budget, type BudgetState } from "@/lib/budgets";
import type { Category } from "@/lib/categories";
import type { Transaction } from "@/lib/transactions";

const urgency: Record<BudgetState, number> = { over: 0, near: 1, ok: 2 };

/**
 * The dashboard's view of the budgets in the month on screen, the most
 * urgent first: over budget, then close to the limit, then the rest by how
 * much is used. Without budgets, a pointer to the Budgets page.
 */
export function BudgetsCard({
  budgets,
  categories,
  transactions,
  month,
  monthName,
}: {
  budgets: Budget[];
  categories: Category[];
  transactions: Transaction[];
  month: string;
  monthName: string;
}) {
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const rows = budgets
    .map((budget) => ({ budget, progress: budgetProgress(budget, transactions, month) }))
    .sort(
      (a, b) =>
        urgency[a.progress.state] - urgency[b.progress.state] || b.progress.percent - a.progress.percent,
    );

  return (
    <section aria-labelledby="budgets-heading" className={`${cardClass} p-4 sm:p-6`}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="budgets-heading" className="text-lg font-semibold">
          Budgets
        </h2>
        <Link href="/budgets" className="text-sm font-medium text-foreground underline underline-offset-2">
          {budgets.length === 0 ? "Set one" : "Manage"}
        </Link>
      </div>
      {budgets.length === 0 ? (
        <p className="mt-2 text-sm text-muted">
          Set a monthly limit for your spending, or for one category, and
          see here how {monthName} is going.
        </p>
      ) : (
        <ul className="mt-4 space-y-5">
          {rows.map(({ budget, progress }) => (
            <li key={budget.id}>
              <BudgetMeter
                label={budgetLabel(budget, categoryNames)}
                progress={progress}
                limitMinor={budget.limit.amountMinor}
                currency={budget.limit.currency}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
