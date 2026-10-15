import Link from "next/link";
import { cardClass } from "@/components/formStyles";
import { OccurrenceRow } from "@/components/OccurrenceRow";
import type { Category } from "@/lib/categories";
import type { DateOrder } from "@/lib/preferences";
import { needsAttention, type RecurringRule } from "@/lib/recurring";
import type { Transaction } from "@/lib/transactions";

/** How many due items the dashboard shows; the rest are on the Bills page. */
const SHOWN = 4;

/**
 * The dashboard's reminder of recurring items to record: overdue, due
 * today, or coming up within their reminder, soonest first. "Mark paid"
 * opens the usual form, filled in.
 */
export function UpcomingCard({
  rules,
  transactions,
  categories,
  today,
  dateOrder,
  onRecord,
}: {
  rules: RecurringRule[];
  transactions: Transaction[];
  categories: Category[];
  today: string;
  dateOrder: DateOrder;
  onRecord: (draft: Transaction) => void;
}) {
  const due = needsAttention(rules, transactions, today);
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <section aria-labelledby="upcoming-heading" className={`${cardClass} overflow-clip`}>
      <div className="flex items-baseline justify-between gap-4 p-4 pb-2 sm:px-6 sm:pt-6">
        <h2 id="upcoming-heading" className="text-lg font-semibold">
          Bills
        </h2>
        <Link href="/bills" className="text-sm font-medium text-foreground underline underline-offset-2">
          {rules.length === 0 ? "Add one" : due.length > SHOWN ? `All ${due.length}` : "Manage"}
        </Link>
      </div>
      {due.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted sm:px-6 sm:pb-6">
          {rules.length === 0
            ? "Add your rent, bills or salary, and they'll show here when they're due."
            : "Nothing due right now."}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {due.slice(0, SHOWN).map((o) => (
            <OccurrenceRow
              key={`${o.rule.id}-${o.date}`}
              occurrence={o}
              today={today}
              dateOrder={dateOrder}
              categoryName={categoryNames.get(o.rule.categoryId) ?? ""}
              onRecord={onRecord}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
