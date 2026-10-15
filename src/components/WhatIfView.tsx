"use client";

import { FlaskConical } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { cardClass, fieldClass } from "@/components/formStyles";
import {
  useAccountPreferences,
  useAccountSettings,
  useAccountTransactions,
  useCategories,
  useDebts,
  useGoalContributions,
  useGoals,
  useRecurringRules,
  useAccounts,
} from "@/lib/accountData";
import { formatMonth } from "@/lib/dates";
import { debtStatus } from "@/lib/debts";
import { goalProgress, savedFromContributions } from "@/lib/goals";
import { currencyDecimals, formatMoney, parseAmount, parseBalance } from "@/lib/money";
import { DEFAULT_PREFERENCES, formatDay } from "@/lib/preferences";
import { accountBalances } from "@/lib/summary";
import { categoryCut, extraDebtPayment, incomeChange, recentMonths, recurringChange, saveEachMonth } from "@/lib/whatif";
import { useToday } from "@/lib/useToday";

/**
 * A scenario's result: always in a dashed box marked "Simulation", with
 * its assumptions, so it's never mistaken for real data (PRD 17).
 */
function Simulation({ children, assumptions }: { children: ReactNode; assumptions: string }) {
  return (
    <div className="mt-3 rounded-control border-2 border-dashed border-line-strong p-3 text-sm">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        <FlaskConical size={14} aria-hidden="true" />
        Simulation, not your real data
      </p>
      <div className="mt-1.5 space-y-1">{children}</div>
      <p className="mt-2 text-xs text-muted">{assumptions}</p>
    </div>
  );
}

function Scenario({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={`${cardClass} p-4 sm:p-6`} aria-label={title}>
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/**
 * The What-if page (PRD 17): five scenarios worked out from the user's
 * own numbers, adjustable, and never saved: nothing here changes an
 * account, a transaction or a plan.
 */
export function WhatIfView() {
  const transactions = useAccountTransactions();
  const settings = useAccountSettings();
  const rules = useRecurringRules();
  const categories = useCategories();
  const goals = useGoals();
  const contributions = useGoalContributions();
  const debts = useDebts();
  const accounts = useAccounts();
  const preferences = useAccountPreferences();
  const today = useToday();

  const [saveText, setSaveText] = useState("500");
  const [saveMonths, setSaveMonths] = useState("12");
  const [goalId, setGoalId] = useState("");
  const [ruleId, setRuleId] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [cut, setCut] = useState("20");
  const [incomeText, setIncomeText] = useState("1000");
  const [debtId, setDebtId] = useState("");
  const [extraText, setExtraText] = useState("200");

  if (
    transactions === null ||
    settings === null ||
    rules === null ||
    categories === null ||
    goals === null ||
    contributions === null ||
    debts === null ||
    accounts === null ||
    preferences === null
  ) {
    return <p className="text-sm text-muted">Loading…</p>;
  }
  const main = settings.currency;
  if (!main) {
    return (
      <p className="text-sm text-muted">
        Choose your currency on the <Link href="/" className="font-medium text-foreground underline">dashboard</Link> first.
      </p>
    );
  }
  const money = (amountMinor: number, currency = main) => formatMoney({ amountMinor, currency });
  const signed = (amountMinor: number, currency = main) => `${amountMinor > 0 ? "+" : amountMinor < 0 ? "−" : ""}${money(Math.abs(amountMinor), currency)}`;
  const dateOrder = preferences.dateOrder ?? DEFAULT_PREFERENCES.dateOrder;
  const months = recentMonths(today);
  const recentText = `${formatMonth(months[0])} to ${formatMonth(months[2])}`;
  const decimals = currencyDecimals(main);
  const amountHint = decimals === 0 ? "a whole amount" : `an amount with up to ${decimals} decimals`;

  // 1. Save every month
  const saveMinor = parseAmount(saveText, main);
  const monthsCount = Number(saveMonths);
  const openGoals = goals.filter((g) => !g.archived && g.target.currency === main);
  const goal = openGoals.find((g) => g.id === goalId) ?? openGoals[0];
  const balances = accountBalances(accounts, transactions, today);
  const goalRemaining = goal
    ? (goalProgress(goal, goal.accountId === null ? savedFromContributions(goal.id, contributions) : (balances.get(goal.accountId) ?? null))
        ?.remainingMinor ?? null)
    : null;
  const save =
    saveMinor !== null && Number.isInteger(monthsCount) && monthsCount > 0 && monthsCount <= 600
      ? saveEachMonth(saveMinor, monthsCount, goalRemaining)
      : null;

  // 2. A recurring expense changes
  const expenseRules = rules.filter((r) => r.type === "expense" && !r.paused);
  const rule = expenseRules.find((r) => r.id === ruleId) ?? expenseRules[0];
  const newMinor = rule ? parseBalance(newAmount === "" ? "" : newAmount, rule.amount.currency) : null;
  const change = rule && newMinor !== null && newMinor >= 0 ? recurringChange(rule, newMinor) : null;

  // 3. Spend less in a category
  const spendingCategories = categories.filter((c) => c.kind === "expense" && !c.archived);
  const category = spendingCategories.find((c) => c.id === categoryId) ?? spendingCategories[0];
  const cutPercent = Number(cut);
  const cutOk = Number.isFinite(cutPercent) && cutPercent > 0 && cutPercent <= 100;
  const cutResult = category && cutOk ? categoryCut(transactions, category.id, cutPercent, today, main) : null;

  // 4. Income changes
  const incomeMinor = parseBalance(incomeText, main);
  const income = incomeMinor !== null ? incomeChange(transactions, incomeMinor, today, main) : null;

  // 5. Pay more on a debt
  const openDebts = debts.filter((d) => !d.archived);
  const debt = openDebts.find((d) => d.id === debtId) ?? openDebts[0];
  const extraMinor = debt ? parseAmount(extraText, debt.currency) : null;
  const remaining = debt ? debtStatus(debt, transactions).remainingMinor : 0;
  const extra = debt && extraMinor !== null ? extraDebtPayment(debt, remaining, extraMinor) : null;
  const payoffText = (p: NonNullable<typeof extra>["now"], currency: string) =>
    p.kind === "never"
      ? "never paid off: the installment doesn't cover the interest"
      : p.kind === "too-long"
        ? "over 100 years"
        : `${p.payments} ${p.payments === 1 ? "payment" : "payments"}${p.lastDate ? `, last around ${formatDay(p.lastDate, today, dateOrder)}` : ""}${
            p.interestMinor !== null ? `, ${money(p.interestMinor, currency)} interest` : ""
          }`;

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-muted">
        Try changes before making them. Results are worked out from your own numbers and are never saved: nothing
        here changes your accounts, transactions or plans. They&apos;re projections, not promises.
      </p>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <Scenario title="What if I save a fixed amount every month?">
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">
              Each month ({main})
              <input type="text" inputMode="decimal" value={saveText} onChange={(e) => setSaveText(e.target.value)} className={fieldClass} />
            </label>
            <label className="block text-sm font-medium">
              For (months)
              <input type="number" inputMode="numeric" min={1} max={600} value={saveMonths} onChange={(e) => setSaveMonths(e.target.value)} className={fieldClass} />
            </label>
            {openGoals.length > 0 && (
              <label className="col-span-2 block text-sm font-medium">
                Toward
                <select value={goal?.id ?? ""} onChange={(e) => setGoalId(e.target.value)} className={fieldClass}>
                  {openGoals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {save === null ? (
            <p role="alert" className="mt-3 text-sm text-danger">Enter {amountHint} over zero, and 1 to 600 months.</p>
          ) : (
            <Simulation assumptions="The same amount every month, nothing taken out, no interest or returns added.">
              <p>
                After {monthsCount} {monthsCount === 1 ? "month" : "months"}: <strong className="tabular-nums">{money(save.totalMinor)}</strong> put aside.
              </p>
              {goal && (
                <p>
                  {goalRemaining === 0
                    ? `${goal.name} is already reached.`
                    : save.monthsToGoal !== null
                      ? `${goal.name} (${money(goalRemaining ?? 0)} to go) would be reached in ${save.monthsToGoal} ${save.monthsToGoal === 1 ? "month" : "months"}.`
                      : `${goal.name}: what it has saved isn't known yet.`}
                </p>
              )}
            </Simulation>
          )}
        </Scenario>

        <Scenario title="What if a recurring expense changes?">
          {rule ? (
            <>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium">
                  Item
                  <select value={rule.id} onChange={(e) => setRuleId(e.target.value)} className={fieldClass}>
                    {expenseRules.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({formatMoney(r.amount)})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  New amount ({rule.amount.currency})
                  <input type="text" inputMode="decimal" placeholder={formatMoney(rule.amount)} value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className={fieldClass} />
                </label>
              </div>
              {change === null ? (
                <p className="mt-3 text-sm text-muted">Enter the new amount to see the difference.</p>
              ) : (
                <Simulation assumptions="Averaged over a year: a weekly item counts 52 ÷ 12 times a month. Your recurring item isn't changed.">
                  <p>
                    <strong className="tabular-nums">{signed(change.perMonthMinor, rule.amount.currency)}</strong> a month,{" "}
                    <strong className="tabular-nums">{signed(change.perYearMinor, rule.amount.currency)}</strong> a year.
                  </p>
                </Simulation>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">
              No recurring expenses yet. Add them on the <Link href="/bills" className="font-medium text-foreground underline">Bills</Link> page.
            </p>
          )}
        </Scenario>

        <Scenario title="What if I spend less in one category?">
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">
              Category
              <select value={category?.id ?? ""} onChange={(e) => setCategoryId(e.target.value)} className={fieldClass}>
                {spendingCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Less by (%)
              <input type="number" inputMode="numeric" min={1} max={100} value={cut} onChange={(e) => setCut(e.target.value)} className={fieldClass} />
            </label>
          </div>
          {!cutOk ? (
            <p role="alert" className="mt-3 text-sm text-danger">Enter a percent from 1 to 100.</p>
          ) : cutResult === null ? (
            <p className="mt-3 text-sm text-muted">
              No {category?.name ?? ""} spending in {main} from {recentText}, so there&apos;s nothing to base this on yet.
            </p>
          ) : (
            <Simulation assumptions={`Based on your average ${category?.name} spending from ${recentText} (${money(cutResult.averageMinor)} a month).`}>
              <p>
                You&apos;d keep about <strong className="tabular-nums">{money(cutResult.perMonthMinor)}</strong> a month,{" "}
                <strong className="tabular-nums">{money(cutResult.perYearMinor)}</strong> a year.
              </p>
            </Simulation>
          )}
        </Scenario>

        <Scenario title="What if my income changes?">
          <label className="mt-3 block text-sm font-medium">
            Change each month ({main}; use − for less)
            <input type="text" inputMode="decimal" value={incomeText} onChange={(e) => setIncomeText(e.target.value)} className={fieldClass} />
          </label>
          {incomeMinor === null ? (
            <p role="alert" className="mt-3 text-sm text-danger">Enter {amountHint}, like 1000 or -500.</p>
          ) : income === null ? (
            <p className="mt-3 text-sm text-muted">No income or spending in {main} from {recentText} to base this on yet.</p>
          ) : (
            <Simulation assumptions={`Based on your averages from ${recentText}: ${money(income.incomeMinor)} income and ${money(income.spendingMinor)} spending a month, with spending unchanged.`}>
              <p>
                Left over each month: <strong className="tabular-nums">{money(income.beforeMinor)}</strong> now,{" "}
                <strong className={`tabular-nums ${income.afterMinor < 0 ? "text-danger" : ""}`}>{money(income.afterMinor)}</strong> with the change
                ({signed(income.perYearMinor)} a year).
              </p>
            </Simulation>
          )}
        </Scenario>

        <Scenario title="What if I pay more on a debt?">
          {debt ? (
            <>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium">
                  Debt
                  <select value={debt.id} onChange={(e) => setDebtId(e.target.value)} className={fieldClass}>
                    {openDebts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Extra each payment ({debt.currency})
                  <input type="text" inputMode="decimal" value={extraText} onChange={(e) => setExtraText(e.target.value)} className={fieldClass} />
                </label>
              </div>
              {extra === null ? (
                <p role="alert" className="mt-3 text-sm text-danger">Enter an extra amount over zero.</p>
              ) : (
                <Simulation
                  assumptions={`From the estimated ${money(remaining, debt.currency)} left. ${
                    debt.annualRate !== null
                      ? `Interest at the ${debt.annualRate}% a year you entered, added each period.`
                      : "Interest isn't included: the rate isn't known."
                  }`}
                >
                  <p>Now: {payoffText(extra.now, debt.currency)}.</p>
                  <p>
                    With {money(extraMinor!, debt.currency)} more: {payoffText(extra.withExtra, debt.currency)}.
                  </p>
                  {extra.saved && extra.saved.payments > 0 && (
                    <p className="font-medium">
                      {extra.saved.payments} fewer {extra.saved.payments === 1 ? "payment" : "payments"}
                      {extra.saved.interestMinor !== null && `, ${money(extra.saved.interestMinor, debt.currency)} less interest`}.
                    </p>
                  )}
                </Simulation>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">
              No debts. Add one on the <Link href="/debts" className="font-medium text-foreground underline">Debts</Link> page to try this.
            </p>
          )}
        </Scenario>
      </div>
    </div>
  );
}
