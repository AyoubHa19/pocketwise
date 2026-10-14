import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  allTags,
  applyFilters,
  filtersFromQuery,
  filtersToQuery,
  firstPart,
  isFiltered,
  matchesFilters,
  NO_FILTERS,
  sortTransactions,
  type TransactionFilters,
} from "@/lib/transactionFilters";
import type { Transaction } from "@/lib/transactions";

const t = (id: string, over: Partial<Transaction> = {}): Transaction => ({
  id,
  type: "expense",
  amount: { amountMinor: 1000, currency: "MAD" },
  category: "Food",
  categoryId: "food",
  date: "2026-10-10",
  accountId: "bank",
  ...over,
});

const f = (over: Partial<TransactionFilters>): TransactionFilters => ({ ...NO_FILTERS, ...over });

// Newest first, as the server gives them.
const list = [
  t("market", { date: "2026-10-12", description: "Supermarket", tags: ["family", "weekly"], amount: { amountMinor: 32000, currency: "MAD" } }),
  t("cafe", { date: "2026-10-12", note: "Café with Sam", amount: { amountMinor: 1500, currency: "MAD" } }),
  t("salary", { date: "2026-10-01", type: "income", category: "Salary", categoryId: "salary", amount: { amountMinor: 500000, currency: "MAD" } }),
  t("atm", { date: "2026-09-30", type: "transfer", category: "Transfer", categoryId: undefined, accountId: "bank", toAccountId: "cash", amount: { amountMinor: 10000, currency: "MAD" } }),
  t("euro", { date: "2026-09-20", amount: { amountMinor: 900, currency: "EUR" }, tags: ["Trip"] }),
];
const ids = (l: Transaction[]) => l.map((x) => x.id);
const run = (over: Partial<TransactionFilters>) => ids(applyFilters(list, f(over), "MAD"));

describe("search", () => {
  it("finds words in the description, note, category, tags and amount", () => {
    expect(run({ search: "supermarket" })).toEqual(["market"]);
    expect(run({ search: "sam" })).toEqual(["cafe"]);
    expect(run({ search: "salary" })).toEqual(["salary"]);
    expect(run({ search: "weekly" })).toEqual(["market"]);
    expect(run({ search: "320" })).toEqual(["market"]);
  });

  it("ignores case and accents, and needs every word", () => {
    expect(run({ search: "CAFE" })).toEqual(["cafe"]);
    expect(run({ search: "food family" })).toEqual(["market"]);
    expect(run({ search: "food nothing" })).toEqual([]);
  });

  it("shows everything when empty", () => {
    expect(run({ search: "   " })).toEqual(ids(list));
  });
});

describe("filters", () => {
  it("by type, category and tag (ignoring case)", () => {
    expect(run({ type: "income" })).toEqual(["salary"]);
    expect(run({ type: "transfer" })).toEqual(["atm"]);
    expect(run({ categoryId: "food" })).toEqual(["market", "cafe", "euro"]);
    expect(run({ tag: "trip" })).toEqual(["euro"]);
  });

  it("by account, with a transfer at either end", () => {
    expect(run({ accountId: "cash" })).toEqual(["atm"]);
    expect(run({ accountId: "bank" })).toEqual(ids(list));
  });

  it("by dates, both ends included", () => {
    expect(run({ from: "2026-10-01" })).toEqual(["market", "cafe", "salary"]);
    expect(run({ to: "2026-09-30" })).toEqual(["atm", "euro"]);
    expect(run({ from: "2026-10-01", to: "2026-10-01" })).toEqual(["salary"]);
  });

  it("together", () => {
    expect(run({ type: "expense", from: "2026-10-01", search: "sam" })).toEqual(["cafe"]);
    expect(matchesFilters(list[0], f({ type: "income" }))).toBe(false);
  });
});

describe("sorting", () => {
  it("keeps newest first, or turns it round", () => {
    expect(run({ sort: "newest" })).toEqual(ids(list));
    expect(run({ sort: "oldest" })).toEqual(ids(list).reverse());
  });

  it("by amount, the main currency first, never mixing currencies", () => {
    expect(run({ sort: "largest" })).toEqual(["salary", "market", "atm", "cafe", "euro"]);
    expect(run({ sort: "smallest" })).toEqual(["cafe", "atm", "market", "salary", "euro"]);
  });

  it("keeps equal amounts newest first", () => {
    const same = [t("new"), t("old", { date: "2026-01-01" })];
    expect(ids(sortTransactions(same, "largest", "MAD"))).toEqual(["new", "old"]);
    expect(ids(sortTransactions(same, "smallest", "MAD"))).toEqual(["new", "old"]);
  });
});

describe("firstPart", () => {
  const days = [t("a", { date: "2026-10-03" }), t("b", { date: "2026-10-02" }), t("c", { date: "2026-10-02" }), t("d", { date: "2026-10-01" })];

  it("takes the whole list when it's short", () => {
    expect(firstPart(days, 10, true)).toBe(days);
  });

  it("finishes the last day when grouped by day", () => {
    expect(ids(firstPart(days, 2, true))).toEqual(["a", "b", "c"]);
    expect(ids(firstPart(days, 3, true))).toEqual(["a", "b", "c"]);
  });

  it("cuts exactly otherwise", () => {
    expect(ids(firstPart(days, 2, false))).toEqual(["a", "b"]);
  });
});

describe("allTags", () => {
  it("lists each tag once, alphabetically", () => {
    expect(allTags([...list, t("x", { tags: ["FAMILY", "zoo"] })])).toEqual(["family", "Trip", "weekly", "zoo"]);
    expect(allTags([])).toEqual([]);
  });
});

describe("counting filters", () => {
  it("counts what narrows the list, not the search or the order", () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
    expect(activeFilterCount(f({ type: "income", tag: "x", from: "2026-01-01", search: "a", sort: "oldest" }))).toBe(3);
    expect(isFiltered(f({ search: " a " }))).toBe(true);
    expect(isFiltered(f({ sort: "oldest" }))).toBe(false);
  });
});

describe("the address bar", () => {
  it("holds only what differs from no filters, and reads it back", () => {
    expect(filtersToQuery(NO_FILTERS)).toBe("");
    const filters = f({ search: "café sam", type: "expense", accountId: "bank", categoryId: "food", tag: "trip", from: "2026-10-01", to: "2026-10-31", sort: "largest" });
    const query = filtersToQuery(filters);
    expect(query).toBe("?q=caf%C3%A9+sam&type=expense&account=bank&category=food&tag=trip&from=2026-10-01&to=2026-10-31&sort=largest");
    expect(filtersFromQuery(new URLSearchParams(query))).toEqual(filters);
  });

  it("ignores what it doesn't know", () => {
    expect(filtersFromQuery(new URLSearchParams("type=gift&sort=random&from=yesterday&to=2026-1-1&account="))).toEqual(NO_FILTERS);
  });
});
