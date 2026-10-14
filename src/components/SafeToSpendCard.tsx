import Link from "next/link";
import { cardClass } from "@/components/formStyles";
import type { Account } from "@/lib/accounts";
import { formatMoney } from "@/lib/money";
import { safeToSpend, type PlanSettings } from "@/lib/plan";
import { formatDay, type DateOrder } from "@/lib/preferences";
import type { RecurringRule } from "@/lib/recurring";
import type { Transaction } from "@/lib/transactions";

/**
 * The dashboard's safe-to-spend: the amount until payday and per day, with
 * a link to the Plan page, where the whole sum is shown. Without a payday,
 * a pointer to set one.
 */
export function SafeToSpendCard({
  plan,
  accounts,
  transactions,
  rules,
  mainCurrency,
  today,
  dateOrder,
}: {
  plan: PlanSettings;
  accounts: Account[];
  transactions: Transaction[];
  rules: RecurringRule[];
  mainCurrency: string;
  today: string;
  dateOrder: DateOrder;
}) {
  const result = safeToSpend(plan, { accounts, transactions, rules, mainCurrency, today });
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency: mainCurrency });

  return (
    <section aria-labelledby="safe-card-heading" className={`${cardClass} p-4 sm:p-6`}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="safe-card-heading" className="text-lg font-semibold">
          Safe to spend
        </h2>
        <Link href="/plan" className="text-sm font-medium text-foreground underline underline-offset-2">
          {result ? "How it's worked out" : "Set your payday"}
        </Link>
      </div>
      {result ? (
        <>
          <p className={`mt-2 text-2xl font-semibold tabular-nums ${result.resultMinor < 0 ? "text-danger" : ""}`}>
            {result.resultMinor < 0 ? `Short by ${money(-result.resultMinor)}` : money(result.resultMinor)}
          </p>
          <p className="mt-1 text-sm text-muted">
            Until payday, {formatDay(result.period.end, today, dateOrder)}
            {result.resultMinor > 0 && ` · about ${money(result.perDayMinor)} a day`}. An estimate, after bills,
            savings and your reserve.
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted">
          Tell Pocketwise when you&apos;re paid next, and it works out what&apos;s left to spend after your bills,
          savings and reserve.
        </p>
      )}
    </section>
  );
}
