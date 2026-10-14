"use client";

import { Target, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { GoalForm } from "@/components/GoalForm";
import {
  cardClass,
  dangerButtonClass,
  fieldClass,
  pressable,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/formStyles";
import { Toast, type Notice } from "@/components/Toast";
import {
  useAccountPreferences,
  useAccounts,
  useAccountSettings,
  useAccountTransactions,
  useAddContribution,
  useCreateGoal,
  useGoalContributions,
  useGoals,
  useRemoveContribution,
  useRemoveGoal,
  useSetGoalArchived,
  useUpdateGoal,
  type SaveResult,
} from "@/lib/accountData";
import { formatMonth, monthOf } from "@/lib/dates";
import {
  goalProgress,
  MAX_CONTRIBUTION_NOTE_LENGTH,
  monthlyPlan,
  savedFromContributions,
  contributionProblem,
  type Contribution,
  type Goal,
} from "@/lib/goals";
import { currencyDecimals, formatMoney, parseAmount } from "@/lib/money";
import { DEFAULT_PREFERENCES, formatDay } from "@/lib/preferences";
import { accountBalances } from "@/lib/summary";
import { useToday } from "@/lib/useToday";

const iconButtonClass = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-muted hover:bg-surface-muted hover:text-danger ${pressable}`;

/**
 * The Goals page: each savings goal with its progress, what's left, and how
 * much to put aside each month to reach it on time; its own entries (money
 * put aside or taken out) and their history; and adding, editing,
 * archiving or deleting goals (PRD 13).
 */
export function GoalsManager() {
  const goals = useGoals();
  const contributions = useGoalContributions();
  const accounts = useAccounts();
  const transactions = useAccountTransactions();
  const settings = useAccountSettings();
  const preferences = useAccountPreferences();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const setArchived = useSetGoalArchived();
  const removeGoal = useRemoveGoal();
  const addContribution = useAddContribution();
  const removeContribution = useRemoveContribution();
  const today = useToday();

  // Which form is open: adding a goal, editing one, or an entry for one
  // (money in or out).
  const [open, setOpen] = useState<
    | { kind: "new" }
    | { kind: "edit"; id: string }
    | { kind: "entry"; id: string; direction: 1 | -1 }
    | null
  >(null);
  const [history, setHistory] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<Notice | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (
    goals === null ||
    contributions === null ||
    accounts === null ||
    transactions === null ||
    settings === null ||
    preferences === null
  ) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  const dateOrder = preferences.dateOrder ?? DEFAULT_PREFERENCES.dateOrder;
  const balances = accountBalances(accounts, transactions, today);
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? "An account";
  const day = (date: string) => formatDay(date, today, dateOrder);

  /** What the goal has saved, or null when it isn't known. */
  function saved(goal: Goal): number | null {
    if (goal.accountId === null) return savedFromContributions(goal.id, contributions!);
    return balances.get(goal.accountId) ?? null;
  }

  function say(text: string) {
    setError(null);
    setNotice((previous) => ({ id: (previous?.id ?? 0) + 1, text }));
  }

  async function submit(run: Promise<SaveResult>, done: string): Promise<SaveResult> {
    const result = await run;
    if (result.ok) {
      setOpen(null);
      say(done);
    }
    return result;
  }

  async function act(run: Promise<SaveResult>, done: string) {
    const result = await run;
    if (result.ok) say(done);
    else setError(result.message);
  }

  function confirmDelete(goal: Goal) {
    const entries = contributions!.filter((c) => c.goalId === goal.id).length;
    const what = entries > 0 ? ` and its ${entries === 1 ? "entry" : `${entries} entries`}` : "";
    if (!window.confirm(`Delete ${goal.name}${what}? Your transactions and accounts aren't affected.`)) return;
    void act(removeGoal(goal.id), `${goal.name} deleted`);
  }

  function toggleHistory(id: string) {
    setHistory((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function card(goal: Goal) {
    const money = (amountMinor: number) => formatMoney({ amountMinor, currency: goal.target.currency });

    if (open?.kind === "edit" && open.id === goal.id) {
      return (
        <li key={goal.id} className={`${cardClass} p-4 sm:p-6`}>
          <h3 className="mb-4 font-semibold">Edit {goal.name}</h3>
          <GoalForm
            goal={goal}
            accounts={accounts!}
            defaultCurrency={goal.target.currency}
            onCancel={() => setOpen(null)}
            onSubmit={(fields) => submit(updateGoal(goal.id, fields), "Changes saved")}
          />
        </li>
      );
    }

    const savedMinor = saved(goal);
    const progress = goalProgress(goal, savedMinor);
    const plan = monthlyPlan(goal, progress, today);
    const entries = contributions!
      .filter((c) => c.goalId === goal.id)
      .sort((a, b) => b.date.localeCompare(a.date));
    const ownEntries = goal.accountId === null;
    const showHistory = history.has(goal.id);

    let planText: string;
    switch (plan.kind) {
      case "reached":
        planText = "You've reached this goal.";
        break;
      case "no-date":
        planText = "Add a date to reach it by, to see how much to put aside each month.";
        break;
      case "passed":
        planText = `The date, ${day(goal.targetDate!)}, has passed. Change it to see a new monthly amount.`;
        break;
      case "unknown":
        planText = `${accountName(goal.accountId!)} has no starting balance, so what's saved isn't known yet. Add one on the Accounts page.`;
        break;
      case "monthly":
        planText =
          plan.months === 1
            ? `Put aside ${money(plan.amountMinor)} this month to reach it by ${day(goal.targetDate!)}.`
            : `Put aside ${money(plan.amountMinor)} a month for ${plan.months} months, from now to ${formatMonth(monthOf(goal.targetDate!))}, to reach it on time.`;
        break;
    }

    return (
      <li key={goal.id} className={`${cardClass} p-4 sm:p-6`}>
        <div className="flex gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted"
          >
            <Target size={20} strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="min-w-0 truncate font-semibold">{goal.name}</h3>
              <p className={`shrink-0 text-sm font-medium ${progress?.reached ? "text-positive" : "text-muted"}`}>
                {progress === null ? "Not known yet" : progress.reached ? "Reached" : `${progress.percent}% saved`}
              </p>
            </div>
            <div
              role="meter"
              aria-label={goal.name}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress?.percent ?? 0}
              aria-valuetext={
                progress === null
                  ? "Not known yet"
                  : `${progress.percent}% saved: ${money(progress.savedMinor)} of ${money(goal.target.amountMinor)}`
              }
              className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"
            >
              <div className="h-full rounded-full bg-accent" style={{ width: `${progress?.percent ?? 0}%` }} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-sm tabular-nums">
              <p className="text-muted">
                {progress === null ? "—" : money(progress.savedMinor)} of {money(goal.target.amountMinor)}
              </p>
              {progress && !progress.reached && <p className="text-muted">{money(progress.remainingMinor)} to go</p>}
            </div>
            <p className="mt-3 text-sm">{planText}</p>
            <p className="mt-1 text-sm text-muted">
              {goal.targetDate ? `By ${day(goal.targetDate)} · ` : ""}
              {ownEntries ? (
                "Counts your own entries"
              ) : (
                <>
                  Follows{" "}
                  <Link
                    href={`/transactions?account=${goal.accountId}`}
                    className="font-medium text-foreground underline underline-offset-2"
                  >
                    {accountName(goal.accountId!)}
                  </Link>
                  : move money there with a Transfer
                </>
              )}
            </p>
          </div>
        </div>

        {open?.kind === "entry" && open.id === goal.id && (
          <EntryForm
            goal={goal}
            direction={open.direction}
            savedMinor={savedMinor ?? 0}
            today={today}
            onCancel={() => setOpen(null)}
            onSubmit={(amountMinor, date, note) =>
              submit(
                addContribution(goal.id, amountMinor, date, note),
                open.direction === 1 ? `${money(amountMinor)} added to ${goal.name}` : `${money(-amountMinor)} taken out of ${goal.name}`,
              )
            }
          />
        )}

        {showHistory && (
          <div className="mt-4 border-t border-line pt-3">
            <h4 className="text-sm font-semibold">History</h4>
            {entries.length === 0 ? (
              <p className="mt-1 text-sm text-muted">No entries yet.</p>
            ) : (
              <ul className="mt-1 divide-y divide-line">
                {entries.map((entry: Contribution) => (
                  <li key={entry.id} className="flex min-h-11 items-center gap-3 py-1 text-sm">
                    <span className="w-24 shrink-0 text-muted">{day(entry.date)}</span>
                    <span className="min-w-0 flex-1 truncate text-muted">{entry.note}</span>
                    <span className={`shrink-0 font-medium tabular-nums ${entry.amountMinor > 0 ? "text-positive" : ""}`}>
                      {entry.amountMinor > 0 ? "+" : "−"}
                      {money(Math.abs(entry.amountMinor))}
                    </span>
                    <button
                      type="button"
                      aria-label={`Delete the entry: ${entry.amountMinor > 0 ? "+" : "−"}${money(Math.abs(entry.amountMinor))}, ${day(entry.date)}`}
                      title="Delete"
                      onClick={() => void act(removeContribution(entry.id), "Entry deleted")}
                      className={iconButtonClass}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {!goal.archived && ownEntries && open?.kind !== "entry" && (
            <>
              <button
                type="button"
                aria-label={`Add money to ${goal.name}`}
                onClick={() => setOpen({ kind: "entry", id: goal.id, direction: 1 })}
                className={primaryButtonClass}
              >
                Add money
              </button>
              {(savedMinor ?? 0) > 0 && (
                <button
                  type="button"
                  aria-label={`Take money out of ${goal.name}`}
                  onClick={() => setOpen({ kind: "entry", id: goal.id, direction: -1 })}
                  className={secondaryButtonClass}
                >
                  Take out
                </button>
              )}
            </>
          )}
          {ownEntries && (
            <button
              type="button"
              aria-expanded={showHistory}
              aria-label={`History of ${goal.name}`}
              onClick={() => toggleHistory(goal.id)}
              className={secondaryButtonClass}
            >
              History ({entries.length})
            </button>
          )}
          <button
            type="button"
            aria-label={`Edit ${goal.name}`}
            onClick={() => setOpen({ kind: "edit", id: goal.id })}
            className={secondaryButtonClass}
          >
            Edit
          </button>
          <button
            type="button"
            aria-label={`${goal.archived ? "Bring back" : "Archive"} ${goal.name}`}
            onClick={() => void act(setArchived(goal.id, !goal.archived), goal.archived ? `${goal.name} brought back` : `${goal.name} archived`)}
            className={secondaryButtonClass}
          >
            {goal.archived ? "Bring back" : "Archive"}
          </button>
          <button
            type="button"
            aria-label={`Delete ${goal.name}`}
            onClick={() => confirmDelete(goal)}
            className={dangerButtonClass}
          >
            Delete
          </button>
        </div>
      </li>
    );
  }

  const active = goals.filter((g) => !g.archived);
  const archived = goals.filter((g) => g.archived);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-prose text-sm text-muted">
          Save toward something: an emergency fund, a trip, a new laptop.
          A goal counts what&apos;s saved either from your own entries
          (note each time you put money aside) or from an account&apos;s
          balance. Neither is income or spending, so nothing is counted
          twice.
        </p>
        {open?.kind !== "new" && (
          <button type="button" onClick={() => setOpen({ kind: "new" })} className={primaryButtonClass}>
            <span aria-hidden="true" className="mr-1.5 text-lg leading-none">+</span>
            Add goal
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-control border border-danger-line bg-danger-surface px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {open?.kind === "new" && (
        <section aria-labelledby="new-goal-heading" className={`${cardClass} mt-6 p-4 sm:p-6`}>
          <h2 id="new-goal-heading" className="mb-4 font-semibold">New goal</h2>
          <GoalForm
            accounts={accounts}
            defaultCurrency={settings.currency ?? ""}
            onCancel={() => setOpen(null)}
            onSubmit={(fields, currency) => submit(createGoal(fields, currency), `${fields.name} added`)}
          />
        </section>
      )}

      <h2 className="sr-only">Your goals</h2>
      {active.length === 0 && open?.kind !== "new" ? (
        <p className="mt-6 rounded-card border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">
          No goals yet. Add one to see how close you are and how much to
          put aside each month.
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">{active.map(card)}</ul>
      )}

      {archived.length > 0 && (
        <section aria-labelledby="archived-goals-heading" className="mt-10">
          <h2 id="archived-goals-heading" className="text-lg font-semibold">Archived</h2>
          <p className="mt-1 text-sm text-muted">Put away, with everything kept.</p>
          <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">{archived.map(card)}</ul>
        </section>
      )}

      <Toast notice={notice} />
    </>
  );
}

/** Money put aside for a goal (direction 1) or taken out (−1), with its day and a note. */
function EntryForm({
  goal,
  direction,
  savedMinor,
  today,
  onSubmit,
  onCancel,
}: {
  goal: Goal;
  direction: 1 | -1;
  savedMinor: number;
  today: string;
  onSubmit: (amountMinor: number, date: string, note?: string) => Promise<SaveResult>;
  onCancel: () => void;
}) {
  const currency = goal.target.currency;
  const decimals = currencyDecimals(currency);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const minor = parseAmount(amount, currency);
    if (minor === null) {
      setError(decimals === 0 ? `Enter a whole amount greater than zero. ${currency} has no decimals.` : "Enter an amount greater than zero, like 500 or 500.50.");
      return;
    }
    const amountMinor = direction * minor;
    const problem = contributionProblem(amountMinor, savedMinor, date, note.trim() || undefined);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSaving(true);
    const result = await onSubmit(amountMinor, date, note.trim() || undefined);
    setSaving(false);
    if (!result.ok) setError(result.message);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-4 border-t border-line pt-4">
      <h4 className="text-sm font-semibold">
        {direction === 1 ? `Add money to ${goal.name}` : `Take money out of ${goal.name}`}
      </h4>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Amount ({currency})
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            placeholder={decimals === 0 ? "0" : `0.${"0".repeat(decimals)}`}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm font-medium">
          Date
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={fieldClass} />
        </label>
        <label className="block text-sm font-medium sm:col-span-2">
          Note <span className="font-normal text-muted">(optional)</span>
          <input
            type="text"
            maxLength={MAX_CONTRIBUTION_NOTE_LENGTH}
            autoComplete="off"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className={fieldClass}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {direction === 1 ? "Add money" : "Take out"}
        </button>
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>
          Cancel
        </button>
      </div>
    </form>
  );
}
