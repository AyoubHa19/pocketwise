"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BudgetForm } from "@/components/BudgetForm";
import { BudgetMeter } from "@/components/BudgetMeter";
import { CategoryIcon } from "@/components/CategoryIcon";
import {
  cardClass,
  dangerButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/formStyles";
import { MonthPicker } from "@/components/MonthPicker";
import { Toast, type Notice } from "@/components/Toast";
import {
  useAccountSettings,
  useAccountTransactions,
  useBudgets,
  useCategories,
  useCreateBudget,
  useRemoveBudget,
  useUpdateBudget,
  type SaveResult,
} from "@/lib/accountData";
import { budgetLabel, budgetProgress, eligibleTransactions, type Budget } from "@/lib/budgets";
import { formatMonth, monthOf } from "@/lib/dates";
import { useToday } from "@/lib/useToday";

/**
 * The Budgets page: each budget's progress in the chosen month, to add,
 * edit or delete budgets. The rules for what counts are written on the
 * page, so the numbers can be trusted (PRD 12).
 */
export function BudgetsManager() {
  const budgets = useBudgets();
  const categories = useCategories();
  const transactions = useAccountTransactions();
  const settings = useAccountSettings();
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const removeBudget = useRemoveBudget();
  const today = useToday();

  const [pickedMonth, setPickedMonth] = useState<string | null>(null);
  const [direction, setDirection] = useState(0);
  // Which form is open: adding, or editing one budget.
  const [editing, setEditing] = useState<"new" | string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (budgets === null || categories === null || transactions === null || settings === null) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  const currentMonth = monthOf(today);
  const month = pickedMonth ?? currentMonth;
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const label = (b: Budget) => budgetLabel(b, categoryNames);

  function say(text: string) {
    setError(null);
    setNotice((previous) => ({ id: (previous?.id ?? 0) + 1, text }));
  }

  async function submit(run: Promise<SaveResult>, done: string): Promise<SaveResult> {
    const result = await run;
    if (result.ok) {
      setEditing(null);
      say(done);
    }
    return result;
  }

  async function confirmDelete(budget: Budget) {
    if (!window.confirm(`Delete the ${label(budget)} budget? Your transactions aren't affected.`)) return;
    const result = await removeBudget(budget.id);
    if (result.ok) say(`${label(budget)} budget deleted`);
    else setError(result.message);
  }

  function card(budget: Budget) {
    if (editing === budget.id) {
      return (
        <li key={budget.id} className={`${cardClass} p-4 sm:p-6`}>
          <h3 className="mb-4 font-semibold">Edit {label(budget)}</h3>
          <BudgetForm
            budget={budget}
            others={budgets!.filter((b) => b.id !== budget.id)}
            categories={categories!}
            defaultCurrency={budget.limit.currency}
            onCancel={() => setEditing(null)}
            onSubmit={(values) => submit(updateBudget(budget.id, values), "Changes saved")}
          />
        </li>
      );
    }
    const progress = budgetProgress(budget, transactions!, month);
    const count = eligibleTransactions(budget, transactions!, month).length;
    // What it covers, by name: its category's, or "All spending".
    const covers =
      budget.categoryId === null ? "All spending" : (categoryNames.get(budget.categoryId) ?? "");
    // The transactions it counted, on the Transactions page.
    const [year, monthNumber] = month.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const query = new URLSearchParams({
      type: "expense",
      ...(budget.categoryId && { category: budget.categoryId }),
      from: `${month}-01`,
      to: `${month}-${String(lastDay).padStart(2, "0")}`,
    });
    return (
      <li key={budget.id} className={`${cardClass} p-4 sm:p-6`}>
        <div className="flex gap-3">
          <CategoryIcon category={covers} />
          <div className="min-w-0 flex-1">
            <BudgetMeter
              label={label(budget)}
              progress={progress}
              limitMinor={budget.limit.amountMinor}
              currency={budget.limit.currency}
            />
            <p className="mt-2 text-sm text-muted">
              {/* With a name of its own, say what it covers. */}
              {budget.name && `${covers} · `}
              Warns from {budget.warnPercent}% ·{" "}
              <Link
                href={`/transactions?${query.toString()}`}
                className="font-medium text-foreground underline underline-offset-2"
              >
                {count === 1 ? "1 transaction" : `${count} transactions`}
              </Link>
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          {/* Named in full for screen readers, which list every "Edit". */}
          <button
            type="button"
            aria-label={`Edit the ${label(budget)} budget`}
            onClick={() => setEditing(budget.id)}
            className={secondaryButtonClass}
          >
            Edit
          </button>
          <button
            type="button"
            aria-label={`Delete the ${label(budget)} budget`}
            onClick={() => void confirmDelete(budget)}
            className={dangerButtonClass}
          >
            Delete
          </button>
        </div>
      </li>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-2xl text-muted">
          A budget is a limit on your spending each month, for everything or
          for one category. Each month starts fresh. Only expenses count:
          income, refunds included, doesn&apos;t lower what a budget has used,
          transfers between your accounts never count, and spending in
          another currency counts only in a budget in that currency.
        </p>
        {editing !== "new" && (
          <button type="button" onClick={() => setEditing("new")} className={primaryButtonClass}>
            <span aria-hidden="true" className="mr-1.5 text-lg leading-none">+</span>
            Add budget
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-control border border-danger-line bg-danger-surface px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {editing === "new" && (
        <section aria-labelledby="new-budget-heading" className={`${cardClass} mt-6 p-4 sm:p-6`}>
          <h2 id="new-budget-heading" className="mb-4 font-semibold">New budget</h2>
          <BudgetForm
            others={budgets}
            categories={categories}
            defaultCurrency={settings.currency ?? ""}
            onCancel={() => setEditing(null)}
            onSubmit={(values) => submit(createBudget(values), "Budget added")}
          />
        </section>
      )}

      <div className="mt-6 max-w-md">
        <MonthPicker
          align="start"
          month={month}
          currentMonth={currentMonth}
          direction={direction}
          onChange={(next) => {
            if (next !== month) setDirection(next > month ? 1 : -1);
            setPickedMonth(next);
          }}
        />
      </div>

      <h2 className="sr-only">Budgets in {formatMonth(month)}</h2>
      {budgets.length === 0 && editing !== "new" ? (
        <p className="mt-6 rounded-card border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">
          No budgets yet. Add one to see how your spending compares with
          what you planned.
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">{budgets.map(card)}</ul>
      )}

      <Toast notice={notice} />
    </>
  );
}
