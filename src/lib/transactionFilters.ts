import { amountToInputText } from "@/lib/money";
import type { Transaction, TransactionType } from "@/lib/transactions";

// The Transactions page's search, filters and sorting (PRD 7.5). Pure
// functions, so they're tested on their own; the page keeps the filters in
// the address bar (filtersToQuery, filtersFromQuery), so a reload or a
// shared link shows the same results.

export type SortOrder = "newest" | "oldest" | "largest" | "smallest";
export const SORT_ORDERS: SortOrder[] = ["newest", "oldest", "largest", "smallest"];

export type TransactionFilters = {
  /** Words to look for in the description, note, category, tags or amount. */
  search: string;
  type: TransactionType | "all";
  /** Only this account's transactions, a transfer at either end. */
  accountId: string | null;
  categoryId: string | null;
  tag: string | null;
  /** First and last day to include, "YYYY-MM-DD"; null for no limit. */
  from: string | null;
  to: string | null;
  sort: SortOrder;
};

export const NO_FILTERS: TransactionFilters = {
  search: "",
  type: "all",
  accountId: null,
  categoryId: null,
  tag: null,
  from: null,
  to: null,
  sort: "newest",
};

/** Lower case, without accents, so "cafe" finds "Café". */
function folded(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("en");
}

/**
 * Whether the transaction has every word of the search somewhere in its
 * description, note, category name, tags or amount ("320" finds 320.00).
 */
function matchesSearch(t: Transaction, search: string): boolean {
  const words = folded(search).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = folded(
    [t.description, t.note, t.category, ...(t.tags ?? []), amountToInputText(t.amount)]
      .filter(Boolean)
      .join(" "),
  );
  return words.every((word) => haystack.includes(word));
}

/** Whether the transaction passes every filter (sorting aside). */
export function matchesFilters(t: Transaction, f: TransactionFilters): boolean {
  if (f.type !== "all" && t.type !== f.type) return false;
  if (f.accountId && t.accountId !== f.accountId && t.toAccountId !== f.accountId) return false;
  if (f.categoryId && t.categoryId !== f.categoryId) return false;
  if (f.tag && !(t.tags ?? []).some((tag) => folded(tag) === folded(f.tag!))) return false;
  // "YYYY-MM-DD" dates compare correctly as text.
  if (f.from && t.date < f.from) return false;
  if (f.to && t.date > f.to) return false;
  return matchesSearch(t, f.search);
}

/**
 * The transactions in the chosen order. `transactions` comes newest first
 * (as the server lists them), which "newest" keeps and "oldest" reverses.
 * Amounts in different currencies can't be compared, so by amount, the
 * main currency comes first, then each other currency in turn, each
 * sorted on its own; equal amounts stay newest first.
 */
export function sortTransactions(
  transactions: Transaction[],
  sort: SortOrder,
  mainCurrency: string,
): Transaction[] {
  if (sort === "newest") return transactions;
  if (sort === "oldest") return [...transactions].reverse();
  const direction = sort === "largest" ? -1 : 1;
  const rank = (currency: string) => (currency === mainCurrency ? "" : currency);
  // Array sort is stable, so ties keep the newest-first order.
  return [...transactions].sort(
    (a, b) =>
      rank(a.amount.currency).localeCompare(rank(b.amount.currency)) ||
      direction * (a.amount.amountMinor - b.amount.amountMinor),
  );
}

/** Filtered, then sorted. */
export function applyFilters(
  transactions: Transaction[],
  filters: TransactionFilters,
  mainCurrency: string,
): Transaction[] {
  return sortTransactions(
    transactions.filter((t) => matchesFilters(t, filters)),
    filters.sort,
    mainCurrency,
  );
}

/**
 * The first `limit` transactions or so, for showing a long list a part at
 * a time. With `wholeDays` (when the list is grouped by day) it goes on to
 * the end of the last day, so no day shows only part of its transactions
 * or a total that's missing some.
 */
export function firstPart(transactions: Transaction[], limit: number, wholeDays: boolean): Transaction[] {
  if (transactions.length <= limit) return transactions;
  if (!wholeDays) return transactions.slice(0, limit);
  let end = limit;
  while (end < transactions.length && transactions[end].date === transactions[limit - 1].date) end++;
  return transactions.slice(0, end);
}

/** Every tag used, once each (ignoring case), in alphabetical order. */
export function allTags(transactions: Transaction[]): string[] {
  const byKey = new Map<string, string>();
  for (const t of transactions) {
    for (const tag of t.tags ?? []) {
      if (!byKey.has(folded(tag))) byKey.set(folded(tag), tag);
    }
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}

/** How many filters narrow the list (the search and the order aside). */
export function activeFilterCount(f: TransactionFilters): number {
  return [f.type !== "all", f.accountId, f.categoryId, f.tag, f.from, f.to].filter(Boolean).length;
}

/** Whether anything at all differs from NO_FILTERS, the order included. */
export function isFiltered(f: TransactionFilters): boolean {
  return activeFilterCount(f) > 0 || f.search.trim() !== "";
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TYPES = ["income", "expense", "transfer"];

/** The filters as an address-bar query ("?q=food&type=expense"), only what differs from NO_FILTERS. */
export function filtersToQuery(f: TransactionFilters): string {
  const params = new URLSearchParams();
  if (f.search.trim()) params.set("q", f.search.trim());
  if (f.type !== "all") params.set("type", f.type);
  if (f.accountId) params.set("account", f.accountId);
  if (f.categoryId) params.set("category", f.categoryId);
  if (f.tag) params.set("tag", f.tag);
  if (f.from) params.set("from", f.from);
  if (f.to) params.set("to", f.to);
  if (f.sort !== "newest") params.set("sort", f.sort);
  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * The filters from an address-bar query. Anything unknown or malformed is
 * ignored, since anyone can type an address.
 */
export function filtersFromQuery(params: URLSearchParams): TransactionFilters {
  const text = (name: string) => params.get(name)?.trim() || null;
  const date = (name: string) => {
    const value = text(name);
    return value && DATE.test(value) ? value : null;
  };
  const type = text("type");
  const sort = text("sort");
  return {
    search: params.get("q") ?? "",
    type: type && TYPES.includes(type) ? (type as TransactionType) : "all",
    accountId: text("account"),
    categoryId: text("category"),
    tag: text("tag"),
    from: date("from"),
    to: date("to"),
    sort: sort && (SORT_ORDERS as string[]).includes(sort) ? (sort as SortOrder) : "newest",
  };
}
