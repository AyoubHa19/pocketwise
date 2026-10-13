import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadTransactions,
  saveTransactions,
  TRANSACTIONS_STORAGE_KEY,
} from "@/lib/storage";
import type { Transaction } from "@/lib/transactions";

/**
 * A stand-in for the browser's localStorage, kept in memory. Node has no
 * localStorage, and this one can also be told to refuse writes.
 */
class MemoryStorage {
  items = new Map<string, string>();
  refuseWrites = false;
  refuseWritesTo: (key: string) => boolean = () => this.refuseWrites;

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.refuseWritesTo(key)) {
      throw new DOMException("Storage is full", "QuotaExceededError");
    }
    this.items.set(key, value);
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  backupKeys(): string[] {
    return [...this.items.keys()].filter((key) => key.includes(".backup-"));
  }
}

const groceries: Transaction = {
  id: "groceries",
  type: "expense",
  amount: { amountMinor: 1250, currency: "USD" },
  category: "Food",
  date: "2026-10-13",
};

const saved = (transactions: unknown[], version = 1) =>
  JSON.stringify({ version, transactions });

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal("localStorage", storage);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("saving and loading", () => {
  it("starts with no transactions", () => {
    expect(loadTransactions()).toEqual([]);
  });

  it("loads exactly what was saved", () => {
    expect(saveTransactions([groceries])).toBe(true);
    expect(loadTransactions()).toEqual([groceries]);
  });

  it("saves a version number with the data", () => {
    saveTransactions([groceries]);
    const raw = storage.getItem(TRANSACTIONS_STORAGE_KEY) ?? "";
    expect(JSON.parse(raw)).toEqual({ version: 1, transactions: [groceries] });
  });
});

describe("unreadable data", () => {
  it("starts fresh, but keeps a backup of data that isn't JSON", () => {
    storage.setItem(TRANSACTIONS_STORAGE_KEY, "this is not JSON {");

    expect(loadTransactions()).toEqual([]);
    const [backupKey] = storage.backupKeys();
    expect(storage.getItem(backupKey)).toBe("this is not JSON {");
  });

  it("keeps a backup of data saved in a format it doesn't know", () => {
    storage.setItem(TRANSACTIONS_STORAGE_KEY, saved([groceries], 99));

    expect(loadTransactions()).toEqual([]);
    expect(storage.backupKeys()).toHaveLength(1);
  });

  it("keeps the readable transactions and backs up the damaged ones", () => {
    const damaged = { ...groceries, id: "damaged", amount: { amountMinor: 12.5 } };
    storage.setItem(TRANSACTIONS_STORAGE_KEY, saved([groceries, damaged]));

    expect(loadTransactions()).toEqual([groceries]);
    expect(storage.backupKeys()).toHaveLength(1);
  });

  it("makes only one backup, however many times the page is opened", () => {
    vi.useFakeTimers(); // Each load gets a new time, so a new backup key.
    storage.setItem(TRANSACTIONS_STORAGE_KEY, "this is not JSON {");

    for (let load = 0; load < 3; load++) {
      loadTransactions();
      vi.advanceTimersByTime(1000);
    }
    expect(storage.backupKeys()).toHaveLength(1);
  });

  it("leaves the damaged data in place if it can't make a backup", () => {
    storage.setItem(TRANSACTIONS_STORAGE_KEY, "this is not JSON {");
    storage.refuseWritesTo = (key) => key.includes(".backup-");

    expect(loadTransactions()).toEqual([]);
    expect(storage.getItem(TRANSACTIONS_STORAGE_KEY)).toBe("this is not JSON {");
  });
});

describe("when the browser refuses", () => {
  it("reports that saving failed", () => {
    storage.refuseWrites = true;
    expect(saveTransactions([groceries])).toBe(false);
  });

  it("loads nothing, without crashing, when storage is blocked", () => {
    vi.stubGlobal("localStorage", {
      getItem() {
        throw new DOMException("Blocked", "SecurityError");
      },
    });
    expect(loadTransactions()).toEqual([]);
  });
});
