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
 * The dashboard's one highlighted card, green glass with a glowing rim
 * (.glow-card in globals.css): what's safe to spend until payday and per
 * day, with a link to the Plan page, where the whole sum is shown. Without
 * a payday, a pointer to set one. Its text colour follows the theme
 * (--feature-ink): dark on the light glass, white on the dark.
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
      className={`glow-card @container flex min-h-40 flex-col p-5 ${className}`}
    >
      {/* The glow behind, the dark glass with a soft wave like a line on a
          chart, and the shimmering rim: all decoration (globals.css). */}
      <span aria-hidden="true" className="glow-card-halo" />
      <span aria-hidden="true" className="glow-card-fill">
        <svg viewBox="0 0 200 80" preserveAspectRatio="none" className="absolute right-0 bottom-0 h-24 w-3/4 opacity-25">
          <path d="M0 60 C30 60 40 20 70 30 C100 40 110 70 140 50 C165 34 175 10 200 14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
      <span aria-hidden="true" className="glow-card-rim" />
      <div className="relative flex items-start justify-between gap-3">
        <h2 id="safe-card-heading" className="pt-1.5 text-sm font-medium">
          Safe to spend
        </h2>
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-current/12">
          <ShieldCheck size={18} />
        </span>
      </div>
      {result && amount ? (
        <>
          <p className="relative mt-1 leading-9 font-semibold tracking-tight tabular-nums [overflow-wrap:anywhere]" style={fitOneLine(amount, "1.125rem", "1.75rem")}>
            {amount}
          </p>
          <p className="relative mt-1 text-xs">
            Until payday, {formatDay(result.period.end, today, dateOrder)}
            {result.resultMinor > 0 && ` · about ${money(result.perDayMinor)} a day`}
          </p>
          <Link href="/plan" className="relative mt-auto inline-flex min-h-11 items-end text-sm font-medium underline underline-offset-4">
            How it&apos;s worked out
          </Link>
        </>
      ) : (
        <>
          <p className="relative mt-2 text-sm">
            Tell Pocketwise when you&apos;re paid next, and it works out what&apos;s left to spend after your bills, savings and
            reserve.
          </p>
          <Link
            href="/plan"
            className="relative mt-auto inline-flex min-h-11 w-fit items-center rounded-full bg-(--feature-ink) px-4 text-sm font-semibold text-(--feature-on-ink)"
          >
            Set your payday
          </Link>
        </>
      )}
    </section>
  );
}
