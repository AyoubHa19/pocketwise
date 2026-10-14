import { describe, expect, it } from "vitest";
import type { Account } from "@/lib/accounts";
import type { Category } from "@/lib/categories";
import {
  checkReading,
  describeTransaction,
  possibleDuplicates,
  readingSchema,
  receiptDraft,
  type ReceiptReading,
} from "@/lib/receipts";
import type { Transaction } from "@/lib/transactions";

const accounts: Account[] = [
  { id: "bank", name: "Bank", type: "bank", currency: "AED", opening: null, archived: false },
  { id: "eur", name: "Euro wallet", type: "wallet", currency: "EUR", opening: null, archived: false },
  { id: "old", name: "Old", type: "bank", currency: "USD", opening: null, archived: true },
];
const categories: Category[] = [
  { id: "food", name: "Food", kind: "expense", archived: false },
  { id: "other", name: "Other", kind: "expense", archived: false },
  { id: "salary", name: "Salary", kind: "income", archived: false },
  { id: "gone", name: "Gone", kind: "expense", archived: true },
];
const data = { accounts, categories, mainCurrency: "AED", today: "2026-10-14" };

const reading = (over: Partial<ReceiptReading> = {}): ReceiptReading => ({
  isReceipt: true,
  merchant: "Carrefour Market",
  date: "2026-10-12",
  total: "125.50",
  currency: "AED",
  category: "Food",
  items: [{ name: "Bread", amount: "4.50" }],
  ...over,
});

describe("readingSchema", () => {
  it("lets the model pick only the user's categories, or none", () => {
    const schema = readingSchema(["Food", "Other"]);
    expect(schema.properties.category.enum).toEqual(["Food", "Other", ""]);
    expect(schema.required).toEqual(["isReceipt", "merchant", "date", "total", "currency", "category", "items"]);
    expect(schema.additionalProperties).toBe(false);
  });
});

describe("checkReading", () => {
  it("keeps a good reading, trimmed", () => {
    expect(checkReading({ ...reading(), merchant: "  Carrefour Market ", currency: "aed" })).toEqual(reading());
  });

  it("turns wrong types into empty values and caps lengths and items", () => {
    const checked = checkReading({
      isReceipt: "yes",
      merchant: 42,
      date: null,
      total: "x".repeat(50),
      currency: ["AED"],
      category: undefined,
      items: [...Array.from({ length: 40 }, (_, i) => ({ name: `Item ${i}`, amount: 1 })), "junk", { name: "" }],
    })!;
    expect(checked.isReceipt).toBe(false);
    expect(checked.merchant).toBe("");
    expect(checked.date).toBe("");
    expect(checked.total).toHaveLength(20);
    expect(checked.currency).toBe("");
    expect(checked.items).toHaveLength(30);
    expect(checked.items[0]).toEqual({ name: "Item 0", amount: "" });
  });

  it("refuses anything that isn't an object", () => {
    expect(checkReading(null)).toBeNull();
    expect(checkReading("receipt")).toBeNull();
  });
});

describe("receiptDraft", () => {
  it("fills in an expense from a clear receipt, with no warnings", () => {
    const draft = receiptDraft(reading(), data);
    expect(draft.warnings).toEqual([]);
    expect(draft.amountRead).toBe(true);
    expect(draft.transaction).toMatchObject({
      type: "expense",
      amount: { amountMinor: 12550, currency: "AED" },
      category: "Food",
      categoryId: "food",
      date: "2026-10-12",
      description: "Carrefour Market",
      note: "From a scanned receipt",
      accountId: "bank",
    });
  });

  it("uses the account in the receipt's currency", () => {
    const draft = receiptDraft(reading({ currency: "EUR", total: "8.40" }), data);
    expect(draft.transaction).toMatchObject({ accountId: "eur", amount: { amountMinor: 840, currency: "EUR" } });
  });

  it("warns instead of guessing when something can't be read", () => {
    const draft = receiptDraft(reading({ total: "", date: "", currency: "", category: "", merchant: "" }), data);
    expect(draft.amountRead).toBe(false);
    expect(draft.transaction).toMatchObject({ amount: { amountMinor: 0, currency: "AED" }, date: "2026-10-14", category: "Other" });
    expect(draft.transaction.description).toBeUndefined();
    expect(draft.warnings).toEqual([
      "The currency couldn't be read, so AED is assumed.",
      "The total couldn't be read: enter the amount.",
      "The date couldn't be read, so today is used.",
    ]);
  });

  it("refuses a future or impossible date, and a category the user doesn't have", () => {
    expect(receiptDraft(reading({ date: "2027-01-01" }), data).warnings).toContain("The date (2027-01-01) looks wrong, so today is used.");
    expect(receiptDraft(reading({ date: "2026-02-30" }), data).transaction.date).toBe("2026-10-14");
    expect(receiptDraft(reading({ category: "Salary" }), data).transaction.category).toBe("Other");
    expect(receiptDraft(reading({ category: "Gone" }), data).transaction.category).toBe("Other");
  });

  it("warns when there's no account in the receipt's currency, and when it isn't a receipt", () => {
    const usd = receiptDraft(reading({ currency: "USD" }), data);
    expect(usd.warnings[0]).toContain("you have no USD account");
    expect(usd.transaction.accountId).toBeUndefined();
    expect(receiptDraft(reading({ isReceipt: false }), data).warnings[0]).toBe("This doesn't look like a receipt. Check every field.");
  });
});

describe("possibleDuplicates", () => {
  const t = (id: string, over: Partial<Transaction>): Transaction => ({
    id,
    type: "expense",
    amount: { amountMinor: 12550, currency: "AED" },
    category: "Food",
    date: "2026-10-12",
    ...over,
  });
  const draft = receiptDraft(reading(), data).transaction;

  it("finds an expense of the same amount within a day", () => {
    const list = [
      t("same", { description: "Carrefour" }),
      t("next-day", { date: "2026-10-13" }),
      t("too-far", { date: "2026-10-15" }),
      t("other-amount", { amount: { amountMinor: 12551, currency: "AED" } }),
      t("other-currency", { amount: { amountMinor: 12550, currency: "EUR" } }),
      t("income", { type: "income" }),
    ];
    expect(possibleDuplicates(draft, list).map((x) => x.id)).toEqual(["same", "next-day"]);
    expect(describeTransaction(list[0]).replace(/\s/g, " ")).toBe("Carrefour, 2026-10-12, AED 125.50");
  });

  it("looks for nothing when the amount wasn't read", () => {
    expect(possibleDuplicates({ ...draft, amount: { amountMinor: 0, currency: "AED" } }, [t("zero", { amount: { amountMinor: 0, currency: "AED" } })])).toEqual([]);
  });
});
