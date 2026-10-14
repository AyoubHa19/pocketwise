import { addMonths, monthOf } from "@/lib/dates";
import { payoff, PER_YEAR, type Debt, type Payoff } from "@/lib/debts";
import type { RecurringRule } from "@/lib/recurring";
import { monthlyTotals } from "@/lib/summary";
import type { Transaction } from "@/lib/transactions";

// The what-if simulator (PRD 17): scenarios worked out from the user's own
// numbers, without changing any of them. Every result is a projection
// with its assumptions written out; the screens label them "Simulation".
//
// "Recent months" means the 3 full calendar months before the current one:
// the current month isn't over, so it would pull every average down.

/** The 3 full months before `today`'s month, oldest first ("YYYY-MM"). */
export function recentMonths(today: string): string[] {
  const current = monthOf(today);
  return [addMonths(current, -3), addMonths(current, -2), addMonths(current, -1)];
}

/**
 * Saving `amountMinor` every month: the total after `months`, and, toward a
 * goal with `remainingMinor` to go, how many months it takes (rounded up).
 */
export function saveEachMonth(amountMinor: number, months: number, remainingMinor: number | null) {
  return {
    totalMinor: amountMinor * months,
    monthsToGoal: remainingMinor === null || amountMinor <= 0 ? null : Math.ceil(remainingMinor / amountMinor),
  };
}

/**
 * A recurring item costing `newAmountMinor` instead: the change per month
 * (on average over a year: a weekly one counts 52 ÷ 12 times) and per year.
 */
export function recurringChange(rule: RecurringRule, newAmountMinor: number) {
  const perYear = (newAmountMinor - rule.amount.amountMinor) * PER_YEAR[rule.frequency];
  return { perMonthMinor: Math.round(perYear / 12), perYearMinor: perYear };
}

/**
 * Cutting a category's spending by `percent`: its average over the recent
 * months, and what the cut would save per month and per year. Null when it
 * had no spending then (there's nothing to base it on).
 */
export function categoryCut(
  transactions: Transaction[],
  categoryId: string,
  percent: number,
  today: string,
  currency: string,
) {
  const months = new Set(recentMonths(today));
  const total = transactions
    .filter(
      (t) =>
        t.type === "expense" && t.categoryId === categoryId && t.amount.currency === currency && months.has(monthOf(t.date)),
    )
    .reduce((sum, t) => sum + t.amount.amountMinor, 0);
  if (total === 0) return null;
  const averageMinor = Math.round(total / 3);
  const perMonthMinor = Math.round((averageMinor * percent) / 100);
  return { averageMinor, perMonthMinor, perYearMinor: perMonthMinor * 12 };
}

/**
 * Income changing by `changeMinor` a month: what's left over each month on
 * average (income − spending over the recent months), before and after.
 * Null when those months had no income or spending at all.
 */
export function incomeChange(transactions: Transaction[], changeMinor: number, today: string, currency: string) {
  const rows = monthlyTotals(transactions, recentMonths(today)[2], 3, currency);
  const income = rows.reduce((sum, r) => sum + r.incomeMinor, 0);
  const spending = rows.reduce((sum, r) => sum + r.spendingMinor, 0);
  if (income === 0 && spending === 0) return null;
  const beforeMinor = Math.round((income - spending) / 3);
  return {
    incomeMinor: Math.round(income / 3),
    spendingMinor: Math.round(spending / 3),
    beforeMinor,
    afterMinor: beforeMinor + changeMinor,
    perYearMinor: changeMinor * 12,
  };
}

/**
 * Paying `extraMinor` more each installment on a debt with `remainingMinor`
 * left: the payoff now and with the extra, and what it saves (payments,
 * and interest when the rate is known).
 */
export function extraDebtPayment(debt: Debt, remainingMinor: number, extraMinor: number) {
  const now: Payoff = payoff(debt, remainingMinor);
  const withExtra: Payoff = payoff(debt, remainingMinor, debt.paymentMinor + extraMinor);
  const saved =
    now.kind === "paid-off" && withExtra.kind === "paid-off"
      ? {
          payments: now.payments - withExtra.payments,
          interestMinor:
            now.interestMinor === null || withExtra.interestMinor === null ? null : now.interestMinor - withExtra.interestMinor,
        }
      : null;
  return { now, withExtra, saved };
}
