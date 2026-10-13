import { afterEach, describe, expect, it, vi } from "vitest";
import {
  batches,
  clearLocalData,
  hasLocalData,
  isImportMarker,
  missingAfterImport,
} from "@/lib/localImport";
import type { Transaction } from "@/lib/transactions";

const t = (id: string): Transaction => ({
  id,
  type: "expense",
  amount: { amountMinor: 100, currency: "EUR" },
  category: "Food",
  date: "2026-10-13",
});

describe("batches", () => {
  it("splits into pieces of the given size, in order, with the rest last", () => {
    expect(batches([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("makes one piece when everything fits, and none for nothing", () => {
    expect(batches([1, 2], 200)).toEqual([[1, 2]]);
    expect(batches([], 200)).toEqual([]);
  });
});

describe("hasLocalData", () => {
  const none = { currency: null, openingBalance: null };

  it("is false for a browser that never saved anything", () => {
    expect(hasLocalData(none, [])).toBe(false);
  });

  it("is true with transactions, a currency, or a starting balance", () => {
    expect(hasLocalData(none, [t("a")])).toBe(true);
    expect(hasLocalData({ ...none, currency: "MAD" }, [])).toBe(true);
    expect(
      hasLocalData({ ...none, openingBalance: { amountMinor: 0, currency: "MAD", date: "2026-05-01" } }, []),
    ).toBe(true);
  });
});

describe("missingAfterImport", () => {
  it("is empty when every local transaction is in the account", () => {
    expect(missingAfterImport([t("a"), t("b")], [t("b"), t("a"), t("c")])).toEqual([]);
  });

  it("names the ones that didn't arrive", () => {
    expect(missingAfterImport([t("a"), t("b"), t("c")], [t("b")])).toEqual(["a", "c"]);
  });

  it("counts a copy edited in the account as arrived", () => {
    const edited = { ...t("a"), amount: { amountMinor: 999, currency: "EUR" } };
    expect(missingAfterImport([t("a")], [edited])).toEqual([]);
  });
});

describe("clearLocalData", () => {
  afterEach(() => vi.unstubAllGlobals());

  /** A minimal in-memory localStorage, with the parts clearLocalData uses. */
  function fakeStorage(entries: Record<string, string>) {
    const items = new Map(Object.entries(entries));
    return {
      items,
      get length() {
        return items.size;
      },
      key: (i: number) => [...items.keys()][i] ?? null,
      removeItem: (key: string) => void items.delete(key),
    };
  }

  it("removes every Pocketwise entry, backups and marker included, and nothing else", () => {
    const storage = fakeStorage({
      "pocketwise.transactions": "[]",
      "pocketwise.settings": "{}",
      "pocketwise.transactions.backup-1": "x",
      "pocketwise.localImport": "{}",
      "other-app.token": "keep me",
    });
    vi.stubGlobal("localStorage", storage);
    expect(clearLocalData()).toBe(4);
    expect([...storage.items.keys()]).toEqual(["other-app.token"]);
  });

  it("says null when the browser won't allow it", () => {
    vi.stubGlobal("localStorage", {
      get length(): number {
        throw new DOMException("Blocked", "SecurityError");
      },
    });
    expect(clearLocalData()).toBeNull();
  });
});

describe("isImportMarker", () => {
  it("accepts what writeImportMarker saves", () => {
    expect(isImportMarker({ status: "imported", at: 1 })).toBe(true);
    expect(isImportMarker({ status: "dismissed", at: 1 })).toBe(true);
  });

  it.each([[null], [{ status: "done", at: 1 }], [{ status: "imported" }], ["imported"]])(
    "rejects %j",
    (value) => {
      expect(isImportMarker(value)).toBe(false);
    },
  );
});
