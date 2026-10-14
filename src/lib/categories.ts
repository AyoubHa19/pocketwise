// The user's categories: what money was spent on or came from. Each is for
// spending or for income, starts from a default list (PRD 9) and can be
// added to, renamed or archived. A transaction refers to its category by id,
// so a rename shows everywhere at once, and archiving never touches history.

import { TRANSFER_CATEGORY } from "@/lib/transactions";

export type CategoryKind = "expense" | "income";

export type Category = {
  id: string;
  name: string;
  kind: CategoryKind;
  /** Hidden from choices; transactions already in it keep it. */
  archived: boolean;
};

export const MAX_CATEGORY_NAME_LENGTH = 30;

/** Every new user starts with these (PRD 9). */
export const DEFAULT_CATEGORIES: { name: string; kind: CategoryKind }[] = [
  ...[
    "Housing",
    "Food",
    "Transport",
    "Bills",
    "Health",
    "Shopping",
    "Entertainment",
    "Education",
    "Travel",
    "Personal Care",
    "Subscriptions",
    "Debt Payments",
    "Other",
  ].map((name) => ({ name, kind: "expense" as const })),
  ...["Salary", "Freelance", "Business", "Investments", "Gifts", "Other Income"].map(
    (name) => ({ name, kind: "income" as const }),
  ),
];

/**
 * How names are compared: without surrounding spaces or case, so "food" and
 * "Food " count as the same category and can't both exist.
 */
export function sameName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase("en") === b.trim().toLocaleLowerCase("en");
}

export function isCategoryKind(value: unknown): value is CategoryKind {
  return value === "expense" || value === "income";
}

export const CATEGORY_KIND_LABELS: Record<CategoryKind, string> = {
  expense: "Spending",
  income: "Income",
};

/**
 * What's wrong with naming a category `name`, or null if nothing is. It
 * needs some text, at most MAX_CATEGORY_NAME_LENGTH characters, and no
 * other category of the same kind may have it (`others` are the user's
 * categories, without the one being renamed). "Transfer" is kept for
 * transfers. Used by the form and, again, by the server.
 */
export function categoryNameProblem(
  name: string,
  kind: CategoryKind,
  others: { name: string; kind: CategoryKind }[],
): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "Give the category a name.";
  if (trimmed.length > MAX_CATEGORY_NAME_LENGTH) {
    return `A category name can be up to ${MAX_CATEGORY_NAME_LENGTH} characters.`;
  }
  if (sameName(trimmed, TRANSFER_CATEGORY)) return `${TRANSFER_CATEGORY} is kept for transfers between accounts.`;
  const taken = others.find((c) => c.kind === kind && sameName(c.name, trimmed));
  if (taken) {
    return `There's already a ${CATEGORY_KIND_LABELS[kind].toLowerCase()} category called ${taken.name}.`;
  }
  return null;
}
