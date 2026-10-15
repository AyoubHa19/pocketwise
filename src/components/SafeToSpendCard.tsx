import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { fitOneLine } from "@/components/fitOneLine";
import type { Account } from "@/lib/accounts";
import { formatMoney } from "@/lib/money";
import { safeToSpend, type PlanSettings } from "@/lib/plan";
import { formatDay, type DateOrder } from "@/lib/preferences";
import type { RecurringRule } from "@/lib/recurring";
import type { Transaction } from "@/lib/transactions";

/**
 * The dashboard's one highlighted card, in sage green: what's safe to
 * spend until payday and per day, with a link to the Plan page, where the
 * whole sum is shown. Without a payday, a pointer to set one. White text
 * on both ends of the green measures 4.6:1 or more.
 */
export function SafeToSpendCard({
  plan,
  accounts,
  transactions,
  rules,
  mainCurrency,
  today,
  dateOrder,
  className = "",
}: {
  plan: PlanSettings;
  accounts: Account[];
  transactions: Transaction[];
  rules: RecurringRule[];
  mainCurrency: string;
  today: string;
  dateOrder: DateOrder;
  className?: string;
}) {
  const result = safeToSpend(plan, { accounts, transactions, rules, mainCurrency, today });
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency: mainCurrency });
  const amount = result ? (result.resultMinor < 0 ? `Short by ${money(-result.resultMinor)}` : money(result.resultMinor)) : null;

  return (
    <section
      aria-labelledby="safe-card-heading"
      className={`@container relative flex min-h-40 flex-col overflow-hidden rounded-card bg-linear-to-br from-feature-from to-feature-to p-5 text-white shadow-card ${className}`}
    >
      {/* A soft wave behind the text, like a line on a chart. Decorative. */}
      <svg aria-hidden="true" viewBox="0 0 200 80" preserveAspectRatio="none" className="pointer-events-none absolute right-0 bottom-0 h-24 w-3/4 opacity-30">
        <path d="M0 60 C30 60 40 20 70 30 C100 40 110 70 140 50 C165 34 175 10 200 14" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="relative flex items-start justify-between gap-3">
        <h2 id="safe-card-heading" className="pt-1.5 text-sm font-medium text-white">
          Safe to spend
        </h2>
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
          <ShieldCheck size={18} />
        </span>
      </div>
      {result && amount ? (
        <>
          <p className="relative mt-1 leading-9 font-semibold tracking-tight tabular-nums [overflow-wrap:anywhere]" style={fitOneLine(amount, "1.125rem", "1.75rem")}>
            {amount}
          </p>
          <p className="relative mt-1 text-xs text-white">
            Until payday, {formatDay(result.period.end, today, dateOrder)}
            {result.resultMinor > 0 && ` · about ${money(result.perDayMinor)} a day`}
          </p>
          <Link href="/plan" className="relative mt-auto inline-flex min-h-11 items-end text-sm font-medium underline underline-offset-4">
            How it&apos;s worked out
          </Link>
        </>
      ) : (
        <>
          <p className="relative mt-2 text-sm text-white">
            Tell Pocketwise when you&apos;re paid next, and it works out what&apos;s left to spend after your bills, savings and
            reserve.
          </p>
          <Link
            href="/plan"
            className="relative mt-auto inline-flex min-h-11 w-fit items-center rounded-full bg-white px-4 text-sm font-semibold text-[#2c4436]"
          >
            Set your payday
          </Link>
        </>
      )}
    </section>
  );
}
