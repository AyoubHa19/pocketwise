"use client";

import Link from "next/link";
import { useState } from "react";
import { BudgetMeter } from "@/components/BudgetMeter";
import { CategoryIcon } from "@/components/CategoryIcon";
import { cardClass, fieldClass } from "@/components/formStyles";
import { MonthPicker } from "@/components/MonthPicker";
import {
  useAccountPreferences,
  useAccounts,
  useAccountSettings,
  useAccountTransactions,
  useBudgets,
  useCategories,
  useGoalContributions,
  useGoals,
  useRates,
  useRecurringRules,
} from "@/lib/accountData";
import { budgetLabel, budgetProgress } from "@/lib/budgets";
import { formatMonth, formatMonthShort, monthOf } from "@/lib/dates";
import { goalProgress, savedFromContributions, type Goal } from "@/lib/goals";
import { formatMoney } from "@/lib/money";
import { DEFAULT_PREFERENCES, formatDay } from "@/lib/preferences";
import { convertTransactions, rateText } from "@/lib/rates";
import {
  categoryComparison,
  compare,
  insights,
  percentChange,
  recurringPerMonth,
  type Insight,
} from "@/lib/reports";
import { accountBalances } from "@/lib/summary";
import { useToday } from "@/lib/useToday";

const LENGTHS = [1, 3, 6, 12] as const;
const LENGTH_LABELS: Record<(typeof LENGTHS)[number], string> = {
  1: "1 month",
  3: "3 months",
  6: "6 months",
  12: "12 months",
};

const toneClass: Record<Insight["tone"], string> = {
  watch: "border-l-warning",
  good: "border-l-positive",
  info: "border-l-line-strong",
};

/**
 * "+12%" / "−8%" / "no change", against the period before; "new" or "—"
 * without one. From a tiny base a percentage gets unreadable (8 → 2,004.99
 * is +24,962%), so ten times or more reads "250× before".
 */
function changeText(current: number, previous: number): string {
  const change = percentChange(current, previous);
  if (change === null) return current === 0 ? "—" : "new";
  if (change === 0) return "no change";
  if (change >= 900 && previous > 0) return `${Math.round(current / previous)}× before`;
  return `${change > 0 ? "+" : "−"}${Math.abs(change)}%`;
}

/**
 * The Reports page (PRD 21): a period of 1 to 12 months, ending in the
 * month chosen, beside the period of the same length just before it.
 * Totals, month by month, categories, recurring costs, budgets and goals,
 * and insights that each say how they're worked out. Only the main
 * currency is counted; nothing is estimated or filled in.
 */
export function ReportsView() {
  const transactions = useAccountTransactions();
  const settings = useAccountSettings();
  const budgets = useBudgets();
  const categories = useCategories();
  const goals = useGoals();
  const contributions = useGoalContributions();
  const accounts = useAccounts();
  const rules = useRecurringRules();
  const rates = useRates();
  const preferences = useAccountPreferences();
  const today = useToday();
  // Other currencies come in converted, at the user's rates, unless turned off.
  const [withConverted, setWithConverted] = useState(true);
  const [length, setLength] = useState<(typeof LENGTHS)[number]>(3);
  const [pickedMonth, setPickedMonth] = useState<string | null>(null);
  const [direction, setDirection] = useState(0);

  if (
    transactions === null ||
    settings === null ||
    budgets === null ||
    categories === null ||
    goals === null ||
    contributions === null ||
    accounts === null ||
    rules === null ||
    rates === null
  ) {
    return <p className="text-sm text-muted">Loading…</p>;
  }
  const currency = settings.currency;
  if (!currency) {
    return (
      <p className="text-sm text-muted">
        Choose your currency on the{" "}
        <Link href="/" className="font-medium text-foreground underline">
          dashboard
        </Link>{" "}
        first.
      </p>
    );
  }

  const currentMonth = monthOf(today);
  const lastMonth = pickedMonth ?? currentMonth;
  const conversion = convertTransactions(transactions, currency, rates);
  // What the report counts: everything in the main currency, plus, when
  // chosen, the rest converted at the user's rates (shown as such below).
  const counted = withConverted ? conversion.transactions : transactions;
  const comparison = compare(counted, lastMonth, length, currency);
  const { current, previous, rows, months, previousMonths } = comparison;
  const categoryRows = categoryComparison(counted, months, previousMonths, currency);
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const balances = accountBalances(accounts, transactions, today);
  const goalSaved = (g: Goal) =>
    g.accountId === null ? savedFromContributions(g.id, contributions) : (balances.get(g.accountId) ?? null);
  const found = insights({
    transactions: counted,
    budgetTransactions: transactions,
    comparison,
    categories: categoryRows,
    budgets,
    categoryNames,
    goals,
    goalSaved,
    rules,
    currency,
    today,
  });
  const recurring = recurringPerMonth(rules, currency, today);
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency });
  const inPeriod = new Set([...months, ...previousMonths]);
  const inOther = transactions.filter(
    (t) => inPeriod.has(monthOf(t.date)) && t.type !== "transfer" && t.amount.currency !== currency,
  );
  // Other-currency transactions in these periods: converted, and not (no rate).
  const convertible = inOther.filter((t) => conversion.transactions.find((c) => c.id === t.id)?.convertedFrom);
  const leftOut = withConverted ? inOther.length - convertible.length : inOther.length;
  const usedRates = conversion.used.filter((r) => convertible.some((t) => t.amount.currency === r.from || t.amount.currency === r.to));
  const dateOrder = preferences?.dateOrder ?? DEFAULT_PREFERENCES.dateOrder;
  const periodName =
    length === 1 ? formatMonth(lastMonth) : `${formatMonthShort(months[0])} – ${formatMonth(lastMonth)}`;
  const previousName =
    length === 1
      ? formatMonth(previousMonths[0])
      : `${formatMonthShort(previousMonths[0])} – ${formatMonth(previousMonths[previousMonths.length - 1])}`;
  const nothing = current.incomeMinor === 0 && current.spendingMinor === 0;

  const stat = (label: string, value: string, before: string, change: string, className = "") => (
    <div className={`${cardClass} p-4`}>
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${className}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">
        {change} · before: {before}
      </p>
    </div>
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end gap-4">
        <label className="block w-40 text-sm font-medium">
          Period
          <select
            value={length}
            onChange={(event) => setLength(Number(event.target.value) as (typeof LENGTHS)[number])}
            className={fieldClass}
          >
            {LENGTHS.map((l) => (
              <option key={l} value={l}>
                {LENGTH_LABELS[l]}
              </option>
            ))}
          </select>
        </label>
        <div className="w-full max-w-md">
          <p className="mb-1 text-sm font-medium">Ending in</p>
          <MonthPicker
            month={lastMonth}
            currentMonth={currentMonth}
            direction={direction}
            onChange={(next) => {
              if (next !== lastMonth) setDirection(next > lastMonth ? 1 : -1);
              setPickedMonth(next);
            }}
          />
        </div>
      </div>

      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="text-lg font-semibold">
          {periodName}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Compared with {previousName}. In {currency}; transfers between your accounts aren&apos;t counted.
          {leftOut > 0 &&
            (leftOut === 1
              ? ` 1 transaction in another currency ${withConverted ? "has no exchange rate, so it " : ""}isn't included.`
              : ` ${leftOut} transactions in other currencies ${withConverted ? "have no exchange rate, so they " : ""}aren't included.`)}
        </p>
        {convertible.length > 0 && (
          <div className="mt-2 rounded-control bg-surface-muted px-3 py-2 text-sm">
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={withConverted}
                onChange={(event) => setWithConverted(event.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              Include {convertible.length} {convertible.length === 1 ? "transaction" : "transactions"} in other
              currencies, converted to {currency}
            </label>
            {withConverted && (
              <p className="text-xs text-muted">
                At your rates:{" "}
                {usedRates.map((r) => `${rateText(r)} (${formatDay(r.date, today, dateOrder)})`).join(", ")}. Every
                date uses this one rate; budgets still count only their own currency.
              </p>
            )}
          </div>
        )}
        {nothing ? (
          <p className="mt-4 rounded-card border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">
            No income or spending in {currency} in this period yet.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stat("Income", money(current.incomeMinor), money(previous.incomeMinor), changeText(current.incomeMinor, previous.incomeMinor), "text-positive")}
            {stat("Spending", money(current.spendingMinor), money(previous.spendingMinor), changeText(current.spendingMinor, previous.spendingMinor))}
            {stat(
              "Left over (income − spending)",
              money(current.netMinor),
              money(previous.netMinor),
              // A difference, not a percentage: what's left over can be
              // below zero, where a percentage change misleads.
              current.netMinor === previous.netMinor
                ? "no change"
                : `${current.netMinor > previous.netMinor ? "+" : "−"}${money(Math.abs(current.netMinor - previous.netMinor))}`,
              current.netMinor < 0 ? "text-danger" : "",
            )}
            {stat(
              "Share of income spent",
              current.spentPercent === null ? "No income" : `${current.spentPercent}%`,
              previous.spentPercent === null ? "no income" : `${previous.spentPercent}%`,
              current.spentPercent === null || previous.spentPercent === null
                ? "—"
                : current.spentPercent === previous.spentPercent
                  ? "no change"
                  : `${current.spentPercent > previous.spentPercent ? "+" : "−"}${Math.abs(current.spentPercent - previous.spentPercent)} points`,
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="insights-heading">
        <h2 id="insights-heading" className="text-lg font-semibold">
          Insights
        </h2>
        {found.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Nothing stands out. Insights appear when something changes enough to mention, a budget goes over, a
            bill is due or a goal needs attention; comparisons need a previous period with spending.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {found.map((insight) => (
              <li key={insight.id} className={`${cardClass} border-l-4 p-4 ${toneClass[insight.tone]}`}>
                <p className="text-sm font-medium">{insight.text}</p>
                <details className="mt-1 text-sm text-muted">
                  <summary className="min-h-11 cursor-pointer content-center">How this is worked out</summary>
                  <p className="pb-1">{insight.how}</p>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      {length > 1 && (
        <section aria-labelledby="months-heading">
          <h2 id="months-heading" className="text-lg font-semibold">
            Month by month
          </h2>
          {/* Focusable, so a keyboard can scroll it sideways on a phone. */}
          <div tabIndex={0} role="region" aria-labelledby="months-heading" className={`${cardClass} mt-3 overflow-x-auto`}>
            <table className="w-full min-w-[22rem] text-sm tabular-nums">
              <thead>
                <tr className="text-left text-muted">
                  <th scope="col" className="px-4 py-2 font-medium">Month</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Income</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Spending</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Left over</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line border-t border-line">
                {rows.map((r) => (
                  <tr key={r.month}>
                    <th scope="row" className="px-4 py-2 text-left font-medium">
                      {formatMonth(r.month)}
                    </th>
                    <td className="px-4 py-2 text-right text-positive">{money(r.incomeMinor)}</td>
                    <td className="px-4 py-2 text-right">{money(r.spendingMinor)}</td>
                    <td className={`px-4 py-2 text-right ${r.incomeMinor - r.spendingMinor < 0 ? "text-danger" : ""}`}>
                      {money(r.incomeMinor - r.spendingMinor)}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <th scope="row" className="px-4 py-2 text-left">Total</th>
                  <td className="px-4 py-2 text-right text-positive">{money(current.incomeMinor)}</td>
                  <td className="px-4 py-2 text-right">{money(current.spendingMinor)}</td>
                  <td className={`px-4 py-2 text-right ${current.netMinor < 0 ? "text-danger" : ""}`}>
                    {money(current.netMinor)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section aria-labelledby="categories-heading-r">
        <h2 id="categories-heading-r" className="text-lg font-semibold">
          Spending by category
        </h2>
        {categoryRows.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No spending in {currency} in this period or the one before.</p>
        ) : (
          <div tabIndex={0} role="region" aria-labelledby="categories-heading-r" className={`${cardClass} mt-3 overflow-x-auto`}>
            <table className="w-full min-w-[26rem] text-sm tabular-nums">
              <thead>
                <tr className="text-left text-muted">
                  <th scope="col" className="px-4 py-2 font-medium">Category</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">This period</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Share</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Before</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line border-t border-line">
                {categoryRows.map((row) => (
                  <tr key={row.category}>
                    <th scope="row" className="px-4 py-2 text-left font-medium">
                      <span className="flex items-center gap-2">
                        <CategoryIcon category={row.category} small />
                        {row.category}
                      </span>
                    </th>
                    <td className="px-4 py-2 text-right">{money(row.currentMinor)}</td>
                    <td className="px-4 py-2 text-right text-muted">{row.percent}%</td>
                    <td className="px-4 py-2 text-right text-muted">{money(row.previousMinor)}</td>
                    <td className="px-4 py-2 text-right text-muted">{changeText(row.currentMinor, row.previousMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-2">
        <section aria-labelledby="budgets-heading-r">
          <h2 id="budgets-heading-r" className="text-lg font-semibold">
            Budgets in {formatMonth(lastMonth)}
          </h2>
          {budgets.filter((b) => b.limit.currency === currency).length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              No budgets in {currency} yet. <Link href="/budgets" className="font-medium text-foreground underline">Set one</Link>.
            </p>
          ) : (
            <ul className={`${cardClass} mt-3 space-y-5 p-4 sm:p-6`}>
              {budgets
                .filter((b) => b.limit.currency === currency)
                .map((b) => (
                  <li key={b.id}>
                    <BudgetMeter
                      label={budgetLabel(b, categoryNames)}
                      progress={budgetProgress(b, transactions, lastMonth)}
                      limitMinor={b.limit.amountMinor}
                      currency={currency}
                    />
                  </li>
                ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="regular-heading" className="space-y-8">
          <div>
            <h2 id="regular-heading" className="text-lg font-semibold">
              Recurring items
            </h2>
            <p className="mt-2 text-sm">
              {recurring.spendingMinor === 0 && recurring.incomeMinor === 0 ? (
                <>
                  None in {currency} yet. <Link href="/bills" className="font-medium underline">Add your bills</Link>.
                </>
              ) : (
                <>
                  About <span className="font-semibold">{money(recurring.spendingMinor)}</span> a month in bills and{" "}
                  <span className="font-semibold text-positive">{money(recurring.incomeMinor)}</span> in regular
                  income.
                </>
              )}
            </p>
            <p className="mt-1 text-xs text-muted">
              Active items in {currency}, averaged over a year: a weekly one counts 52 ÷ 12 times a month.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Savings goals</h2>
            {goals.filter((g) => !g.archived).length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                No goals yet. <Link href="/goals" className="font-medium text-foreground underline">Add one</Link>.
              </p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {goals
                  .filter((g) => !g.archived)
                  .map((g) => {
                    const p = goalProgress(g, goalSaved(g));
                    return (
                      <li key={g.id} className="flex flex-wrap justify-between gap-x-3">
                        <span className="font-medium">{g.name}</span>
                        <span className="tabular-nums text-muted">
                          {p === null
                            ? "not known yet"
                            : `${p.percent}% · ${formatMoney({ amountMinor: p.savedMinor, currency: g.target.currency })} of ${formatMoney(g.target)}`}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
