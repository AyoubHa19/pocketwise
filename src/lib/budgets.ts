import type { Money } from "@/lib/money";
import { transactionsInMonth } from "@/lib/summary";
import type { Transaction } from "@/lib/transactions";

// Budgets (PRD 12, 10.8): a limit on spending each calendar month, for all
// spending or for one spending category, in one currency. Each month
// starts fresh; nothing carries over.
//
// What counts against a budget ("eligible spending"): expenses in the
// budget's currency, dated in the month, and, for a category budget, in
// that category. So:
// - Income never reduces what a budget has used, refunds included: a
//   refund is recorded as income, and the spending it refunds still
//   happened. (This keeps "spent" an amount you can check line by line.)
// - Transfers never count: they move money between your own accounts.
// - Spending in another currency doesn't count: it can't be added without
//   an exchange rate. Make a budget in that currency for it.
// - Each transaction counts once per budget. A Food expense counts in the
//   Food budget and in an all-spending budget, which is what those two
//   budgets are each for.

export type Budget = {
  id: string;
  /** Optional; without one, the budget is called after its category. */
  name?: string;
  /** The spending category it covers, or null for all spending. */
  categoryId: string | null;
  /** The monthly limit: always more than zero. */
  limit: Money;
  /** "Close to the limit" from this share of it, 1 to 100 percent. */
  warnPercent: number;
};

export const DEFAULT_WARN_PERCENT = 80;
export const MAX_BUDGET_NAME_LENGTH = 40;

/** On track, close to the limit (from warnPercent), or over it. */
export type BudgetState = "ok" | "near" | "over";

export type BudgetProgress = {
  spentMinor: number;
  /** limit − spent: below zero when over budget, so the overspend shows. */
  remainingMinor: number;
  /** spent / limit × 100, rounded down; above 100 when over. */
  percent: number;
  state: BudgetState;
};

/** The transactions that count against the budget in `month` ("YYYY-MM"). */
export function eligibleTransactions(
  budget: Budget,
  transactions: Transaction[],
  month: string,
): Transaction[] {
  return transactionsInMonth(transactions, month).filter(
    (t) =>
      t.type === "expense" &&
      t.amount.currency === budget.limit.currency &&
      (budget.categoryId === null || t.categoryId === budget.categoryId),
  );
}

/** How the budget stands in `month`. */
export function budgetProgress(
  budget: Budget,
  transactions: Transaction[],
  month: string,
): BudgetProgress {
  const spentMinor = eligibleTransactions(budget, transactions, month).reduce(
    (sum, t) => sum + t.amount.amountMinor,
    0,
  );
  const limitMinor = budget.limit.amountMinor;
  // The limit is always above zero, but a bad one mustn't divide by zero.
  if (!(limitMinor > 0)) {
    return { spentMinor, remainingMinor: -spentMinor, percent: 0, state: spentMinor > 0 ? "over" : "ok" };
  }
  // Compared in whole minor units, so 79.999% is never rounded up to near.
  const state: BudgetState =
    spentMinor > limitMinor ? "over" : spentMinor * 100 >= limitMinor * budget.warnPercent ? "near" : "ok";
  return {
    spentMinor,
    remainingMinor: limitMinor - spentMinor,
    percent: Math.floor((spentMinor * 100) / limitMinor),
    state,
  };
}

/** What the budget is called: its name, or its category's, or "All spending". */
export function budgetLabel(budget: Budget, categoryNames: Map<string, string>): string {
  if (budget.name) return budget.name;
  if (budget.categoryId === null) return "All spending";
  return categoryNames.get(budget.categoryId) ?? "A deleted category";
}

/**
 * What's wrong with these budget values, or null if nothing is. The limit
 * must be a whole number of minor units above zero; the warning level a
 * whole percent from 1 to 100; the name, if any, short. And there can be
 * only one budget per category (or for all spending) in each currency
 * (`others` are the user's other budgets), so two never disagree. Used by
 * the form and, again, by the server.
 */
export function budgetProblem(
  values: Omit<Budget, "id">,
  others: Omit<Budget, "id">[],
): string | null {
  if (!Number.isSafeInteger(values.limit.amountMinor) || values.limit.amountMinor <= 0) {
    return "Enter a monthly limit greater than zero.";
  }
  if (!Number.isInteger(values.warnPercent) || values.warnPercent < 1 || values.warnPercent > 100) {
    return "The warning level is a whole percent from 1 to 100.";
  }
  if (values.name !== undefined && values.name.trim().length > MAX_BUDGET_NAME_LENGTH) {
    return `A budget name can be up to ${MAX_BUDGET_NAME_LENGTH} characters.`;
  }
  const clash = others.some(
    (b) => b.categoryId === values.categoryId && b.limit.currency === values.limit.currency,
  );
  if (clash) {
    return values.categoryId === null
      ? `There's already a budget for all spending in ${values.limit.currency}.`
      : `There's already a budget for this category in ${values.limit.currency}.`;
  }
  return null;
}
