"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { cardClass, colorTransition, fieldClass, primaryButtonClass } from "@/components/formStyles";
import { OccurrenceRow } from "@/components/OccurrenceRow";
import { Sheet } from "@/components/Sheet";
import { Toast } from "@/components/Toast";
import { TransactionForm } from "@/components/TransactionForm";
import { useTransactionEditor } from "@/components/useTransactionEditor";
import {
  useAccountPreferences,
  useAccounts,
  useAccountSettings,
  useAccountTransactions,
  useCategories,
  useGoalContributions,
  useGoals,
  usePlan,
  useRecurringRules,
  useSetPlan,
} from "@/lib/accountData";
import { goalProgress, monthlyPlan, savedFromContributions } from "@/lib/goals";
import { amountToInputText, currencyDecimals, formatMoney, parseBalance } from "@/lib/money";
import { daysBetween, safeToSpend, spentThisPeriod, type PlanSettings } from "@/lib/plan";
import { DEFAULT_PREFERENCES, formatDay } from "@/lib/preferences";
import { accountBalances } from "@/lib/summary";
import { useToday } from "@/lib/useToday";

const optionClass = `flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-3 hover:bg-surface-muted ${colorTransition}`;

/**
 * The Plan page (PRD 15, 16): safe-to-spend until the next payday, with
 * every part of the sum shown, the pay period so far, what's coming before
 * payday, and the settings behind it all.
 */
export function PlanView() {
  const plan = usePlan();
  const setPlan = useSetPlan();
  const accounts = useAccounts();
  const transactions = useAccountTransactions();
  const rules = useRecurringRules();
  const categories = useCategories();
  const settings = useAccountSettings();
  const preferences = useAccountPreferences();
  const goals = useGoals();
  const contributions = useGoalContributions();
  const editor = useTransactionEditor(transactions);
  const today = useToday();
  const headingRef = useRef<HTMLHeadingElement>(null);

  if (
    plan === null ||
    accounts === null ||
    transactions === null ||
    rules === null ||
    categories === null ||
    settings === null ||
    preferences === null ||
    goals === null ||
    contributions === null
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

  const dateOrder = preferences.dateOrder ?? DEFAULT_PREFERENCES.dateOrder;
  const day = (date: string) => formatDay(date, today, dateOrder);
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency: main });
  const result = safeToSpend(plan, { accounts, transactions, rules, mainCurrency: main, today });
  const spent = result ? spentThisPeriod(transactions, result.period, main, today) : null;
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const balances = accountBalances(accounts, transactions, today);
  // What the goals ask for each month, as a suggestion for planned savings.
  const goalsMonthly = goals
    .filter((g) => !g.archived && g.target.currency === main)
    .reduce((sum, g) => {
      const saved = g.accountId === null ? savedFromContributions(g.id, contributions) : (balances.get(g.accountId) ?? null);
      const p = monthlyPlan(g, goalProgress(g, saved), today);
      return sum + (p.kind === "monthly" ? p.amountMinor : 0);
    }, 0);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
      <div className="space-y-8">
        {result === null ? (
          <section className={`${cardClass} p-4 sm:p-6`}>
            <h2 className="text-lg font-semibold">When&apos;s your next payday?</h2>
            <p className="mt-1 text-sm text-muted">
              Safe-to-spend runs until your next income. Choose your salary from your{" "}
              <Link href="/bills" className="font-medium text-foreground underline">recurring items</Link>, or pick the
              date, in Plan settings.
            </p>
          </section>
        ) : (
          <section aria-labelledby="safe-heading" className={`${cardClass} p-4 sm:p-6`}>
            <h2 id="safe-heading" ref={headingRef} tabIndex={-1} className="text-sm font-medium text-muted">
              Safe to spend until payday, {day(result.period.end)}
            </h2>
            <p
              className={`mt-1 text-3xl font-semibold tracking-tight tabular-nums ${result.resultMinor < 0 ? "text-danger" : ""}`}
            >
              {result.resultMinor < 0 ? `Short by ${money(-result.resultMinor)}` : money(result.resultMinor)}
            </p>
            <p className="mt-1 text-sm text-muted">
              {result.resultMinor > 0
                ? `About ${money(result.perDayMinor)} a day for ${result.period.daysLeft} ${result.period.daysLeft === 1 ? "day" : "days"}.`
                : "Your bills, savings and reserve come to more than your balance before payday."}{" "}
              An estimate to help you plan, not a guarantee.
            </p>

            <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm tabular-nums">
              <div className="flex justify-between gap-3">
                <dt>
                  In {result.accounts.length === 1 ? result.accounts[0].account.name : `${result.accounts.length} accounts`}
                </dt>
                <dd className="font-medium">{money(result.balanceMinor)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>
                  − Bills before payday, not recorded yet ({result.bills.length})
                </dt>
                <dd>{money(result.billsMinor)}</dd>
              </div>
              {result.later.length > 0 && (
                <div className="flex justify-between gap-3">
                  <dt>− Recorded with a later date ({result.later.length})</dt>
                  <dd>{money(result.laterMinor)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt>− Planned savings</dt>
                <dd>{money(result.savingsMinor)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>− Reserve kept aside</dt>
                <dd>{money(result.reserveMinor)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-line pt-2 font-semibold">
                <dt>= Safe to spend</dt>
                <dd className={result.resultMinor < 0 ? "text-danger" : ""}>{money(result.resultMinor)}</dd>
              </div>
            </dl>

            <ul className="mt-4 space-y-1 text-xs text-muted">
              <li>
                Expected income isn&apos;t counted until it arrives
                {result.expectedIncome.length > 0 &&
                  `: ${result.expectedIncome.map((o) => `${o.rule.name} ${formatMoney(o.rule.amount)} (${day(o.date)})`).join(", ")}`}
                .
              </li>
              <li>Bills you&apos;ve already recorded are already out of your balance, so they&apos;re not subtracted again.</li>
              {result.leftOut.map(({ account, reason }) => (
                <li key={account.id} className="text-warning">
                  {account.name} isn&apos;t counted:{" "}
                  {reason === "no-balance" ? "it has no starting balance yet." : `it's in ${account.currency}, not ${main}.`}
                </li>
              ))}
              {result.otherCurrencyBills.length > 0 && (
                <li className="text-warning">
                  Not subtracted, being in another currency:{" "}
                  {result.otherCurrencyBills.map((o) => `${o.rule.name} ${formatMoney(o.rule.amount)}`).join(", ")}.
                </li>
              )}
            </ul>
          </section>
        )}

        {result && spent && (
          <section aria-labelledby="period-heading">
            <h2 id="period-heading" className="text-lg font-semibold">
              This pay period
            </h2>
            <p className="mt-1 text-sm text-muted">
              {day(result.period.start)} to {day(result.period.end)}
              {result.period.source === "salary" && result.period.rule && ` (${result.period.rule.name})`} ·{" "}
              {(() => {
                const done = daysBetween(result.period.start, today) + 1;
                const left = result.period.daysLeft;
                return `${done} ${done === 1 ? "day" : "days"} in, ${left} to go`;
              })()}
            </p>
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
              <div className={`${cardClass} p-4`}>
                <p className="text-sm text-muted">Spent so far</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{money(spent.spentMinor)}</p>
                <p className="mt-1 text-xs text-muted">About {money(spent.perDayMinor)} a day</p>
              </div>
              <div className={`${cardClass} p-4`}>
                <p className="text-sm text-muted">Safe from now on</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {result.resultMinor > 0 ? `${money(result.perDayMinor)} a day` : "Nothing spare"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {result.resultMinor > 0 && spent.perDayMinor > result.perDayMinor
                    ? "Less than you've spent a day so far."
                    : result.resultMinor > 0
                      ? "At or above what you've spent a day so far."
                      : "Until payday, after bills, savings and reserve."}
                </p>
              </div>
            </div>

            <h3 className="mt-6 font-semibold">Coming up before payday</h3>
            {result.bills.length + result.expectedIncome.length + result.otherCurrencyBills.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Nothing expected before payday.</p>
            ) : (
              <ul className={`${cardClass} mt-2 divide-y divide-line overflow-clip`}>
                {[...result.bills, ...result.otherCurrencyBills, ...result.expectedIncome]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((o) => (
                    <OccurrenceRow
                      key={`${o.rule.id}-${o.date}`}
                      occurrence={o}
                      today={today}
                      dateOrder={dateOrder}
                      categoryName={categoryNames.get(o.rule.categoryId) ?? ""}
                      onRecord={editor.openPrefilled}
                    />
                  ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {/* Filled from the saved plan once: after saving it stays as typed,
          with its "Saved." message. */}
      <PlanSettingsForm
        plan={plan}
        accounts={accounts.filter((a) => !a.archived)}
        incomeRules={rules.filter((r) => r.type === "income")}
        mainCurrency={main}
        goalsMonthly={goalsMonthly}
        today={today}
        onSave={setPlan}
      />

      <Toast notice={editor.notice} />
      <Sheet
        open={editor.sheetOpen}
        title={editor.sheet.kind === "edit" ? "Edit transaction" : "Record it"}
        onClose={editor.closeSheet}
        fallbackFocusRef={headingRef}
      >
        {editor.hasContent && (
          <TransactionForm
            key={editor.sheet.session}
            transaction={editor.editing}
            prefill={editor.prefill}
            accounts={accounts}
            categories={categories}
            defaultCurrency={main}
            onSave={editor.save}
            onCancel={editor.closeSheet}
          />
        )}
      </Sheet>
    </div>
  );
}

/** The settings behind the plan: payday, accounts, savings and reserve. */
function PlanSettingsForm({
  plan,
  accounts,
  incomeRules,
  mainCurrency,
  goalsMonthly,
  today,
  onSave,
}: {
  plan: PlanSettings;
  accounts: { id: string; name: string; currency: string }[];
  incomeRules: { id: string; name: string; frequency: string; amount: { amountMinor: number; currency: string } }[];
  mainCurrency: string;
  goalsMonthly: number;
  today: string;
  onSave: (plan: PlanSettings) => Promise<{ ok: true } | { ok: false; message: string }>;
}) {
  const money = (amountMinor: number) => amountToInputText({ amountMinor, currency: mainCurrency });
  const [payBy, setPayBy] = useState<"salary" | "date">(plan.salaryRuleId ? "salary" : "date");
  const [ruleId, setRuleId] = useState(plan.salaryRuleId ?? incomeRules[0]?.id ?? "");
  const [payday, setPayday] = useState(plan.payday ?? "");
  const [allAccounts, setAllAccounts] = useState(plan.accountIds === null);
  const [picked, setPicked] = useState<string[]>(plan.accountIds ?? accounts.filter((a) => a.currency === mainCurrency).map((a) => a.id));
  const [savings, setSavings] = useState(plan.savingsMinor ? money(plan.savingsMinor) : "");
  const [reserve, setReserve] = useState(plan.reserveMinor ? money(plan.reserveMinor) : "");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    if (!message?.ok) return;
    const timer = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = (text: string) => (text.trim() === "" ? 0 : parseBalance(text, mainCurrency));
    const savingsMinor = amount(savings);
    const reserveMinor = amount(reserve);
    const decimals = currencyDecimals(mainCurrency);
    if (savingsMinor === null || savingsMinor < 0 || reserveMinor === null || reserveMinor < 0) {
      setMessage({ ok: false, text: `Enter amounts of zero or more, with up to ${decimals} decimals.` });
      return;
    }
    if (payBy === "date" && (!payday || payday < today)) {
      setMessage({ ok: false, text: "Pick your next payday: today or later." });
      return;
    }
    if (payBy === "salary" && !ruleId) {
      setMessage({ ok: false, text: "Add your salary as a recurring income on the Bills page first, or pick a date." });
      return;
    }
    const result = await onSave({
      reserveMinor,
      savingsMinor,
      accountIds: allAccounts ? null : picked,
      salaryRuleId: payBy === "salary" ? ruleId : null,
      payday: payBy === "date" ? payday : null,
    });
    setMessage(result.ok ? { ok: true, text: "Saved." } : { ok: false, text: result.message });
  }

  return (
    <form onSubmit={submit} noValidate className={`${cardClass} p-4 sm:p-6 lg:sticky lg:top-6`} aria-labelledby="plan-settings-heading">
      <h2 id="plan-settings-heading" className="text-lg font-semibold">
        Plan settings
      </h2>

      <fieldset className="mt-4">
        <legend className="text-sm font-medium">Payday</legend>
        <div className="mt-1 space-y-1">
          <label className={optionClass}>
            <input type="radio" name="payBy" value="salary" checked={payBy === "salary"} onChange={() => setPayBy("salary")} className="h-4 w-4 accent-accent" />
            <span className="text-sm">My recurring income</span>
          </label>
          <label className={optionClass}>
            <input type="radio" name="payBy" value="date" checked={payBy === "date"} onChange={() => setPayBy("date")} className="h-4 w-4 accent-accent" />
            <span className="text-sm">A date I choose (irregular pay)</span>
          </label>
        </div>
        {payBy === "salary" ? (
          incomeRules.length > 0 ? (
            <label className="mt-2 block text-sm font-medium">
              Which income
              <select value={ruleId} onChange={(event) => setRuleId(event.target.value)} className={fieldClass}>
                {incomeRules.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({formatMoney(r.amount)})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="mt-2 text-sm text-muted">
              No recurring income yet. Add your salary on the{" "}
              <Link href="/bills" className="font-medium text-foreground underline">Bills</Link> page.
            </p>
          )
        ) : (
          <label className="mt-2 block text-sm font-medium">
            Next payday
            <input type="date" value={payday} min={today} onChange={(event) => setPayday(event.target.value)} className={fieldClass} />
          </label>
        )}
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-sm font-medium">Money to count</legend>
        <label className={`${optionClass} mt-1`}>
          <input type="checkbox" checked={allAccounts} onChange={(event) => setAllAccounts(event.target.checked)} className="h-4 w-4 accent-accent" />
          <span className="text-sm">All my {mainCurrency} accounts</span>
        </label>
        {!allAccounts && (
          <div className="mt-1 space-y-1 pl-6">
            {accounts.map((a) => (
              <label key={a.id} className={optionClass}>
                <input
                  type="checkbox"
                  checked={picked.includes(a.id)}
                  onChange={(event) =>
                    setPicked((p) => (event.target.checked ? [...p, a.id] : p.filter((id) => id !== a.id)))
                  }
                  className="h-4 w-4 accent-accent"
                />
                <span className="text-sm">
                  {a.name} <span className="text-muted">({a.currency})</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <label className="mt-5 block text-sm font-medium">
        Planned savings this period ({mainCurrency})
        <input type="text" inputMode="decimal" autoComplete="off" placeholder="0" value={savings} onChange={(event) => setSavings(event.target.value)} className={fieldClass} />
      </label>
      {goalsMonthly > 0 && (
        <button
          type="button"
          onClick={() => setSavings(money(goalsMonthly))}
          className="mt-1 min-h-11 text-sm font-medium text-foreground underline underline-offset-2"
        >
          Use what your goals need a month ({formatMoney({ amountMinor: goalsMonthly, currency: mainCurrency })})
        </button>
      )}

      <label className="mt-4 block text-sm font-medium">
        Reserve kept aside ({mainCurrency})
        <input type="text" inputMode="decimal" autoComplete="off" placeholder="0" value={reserve} onChange={(event) => setReserve(event.target.value)} className={fieldClass} />
      </label>
      <p className="mt-1 text-xs text-muted">A buffer you never want to spend, like an emergency cushion.</p>

      <div className="mt-5">
        <button type="submit" className={primaryButtonClass}>
          Save plan
        </button>
      </div>
      <p role="status" className={message ? `mt-3 text-sm ${message.ok ? "text-positive" : "text-danger"}` : "sr-only"}>
        {message?.text ?? ""}
      </p>
    </form>
  );
}
