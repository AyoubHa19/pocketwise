import type { Account } from "@/lib/accounts";
import type { Category } from "@/lib/categories";
import { addDays } from "@/lib/dates";
import { formatMoney, isSupportedCurrency, parseAmount } from "@/lib/money";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/tags";
import { newTransactionId, type Transaction } from "@/lib/transactions";

// Receipt scanning (PRD 20). A photo of a receipt is read by a model on the
// server (convex/receiptsNode.ts), which returns what it found in the shape
// below. That reply is treated as untrusted input: checked here field by
// field, turned into a draft transaction with warnings for anything
// doubtful, and never saved until the user has reviewed it in the usual
// form.

/** Image types the model can read. */
export const RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
/** The largest image the server accepts (the model's own limit is 5 MB). */
export const MAX_RECEIPT_BYTES = 4_500_000;
/** Photos are shrunk to this many pixels on their longer side before upload. */
export const RECEIPT_MAX_SIDE = 1568;
/** Scans one user can run per day, so a mistake or misuse can't run up costs. */
export const DAILY_SCAN_LIMIT = 30;

/**
 * What a scan comes back with: the reading, or why there's none, in words
 * for the user (not set up yet, the daily limit, an unreadable image…).
 */
export type ScanResult = { ok: true; reading: ReceiptReading } | { ok: false; message: string };

/** What the model is asked to return: every field, empty text when unreadable. */
export type ReceiptReading = {
  isReceipt: boolean;
  merchant: string;
  /** "YYYY-MM-DD", or "" */
  date: string;
  /** The total paid, as a plain decimal like "12.50", or "" */
  total: string;
  /** ISO code like "AED", or "" */
  currency: string;
  /** One of the user's spending category names, or "" */
  category: string;
  items: { name: string; amount: string }[];
};

/**
 * The JSON schema the model's reply must follow (structured outputs).
 * `categories` are the user's spending category names: the model picks one
 * of them, or none.
 */
export function readingSchema(categories: string[]) {
  return {
    type: "object",
    properties: {
      isReceipt: { type: "boolean", description: "Whether the image shows a receipt, bill or invoice." },
      merchant: { type: "string", description: "The shop or business name, as printed. Empty if not readable." },
      date: { type: "string", description: "The purchase date as YYYY-MM-DD. Empty if not readable." },
      total: {
        type: "string",
        description: "The total amount paid, digits with a point for decimals, like 125.50. Empty if not readable.",
      },
      currency: {
        type: "string",
        description: "The ISO 4217 code of the currency, like AED, EUR or MAD. Empty if not shown or unclear.",
      },
      category: {
        type: "string",
        enum: [...categories, ""],
        description: "The best-fitting category from the list, or empty if none fits.",
      },
      items: {
        type: "array",
        description: "The purchased lines, as printed (at most 30).",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            amount: { type: "string", description: "Like 12.50; empty if not readable." },
          },
          required: ["name", "amount"],
          additionalProperties: false,
        },
      },
    },
    required: ["isReceipt", "merchant", "date", "total", "currency", "category", "items"],
    additionalProperties: false,
  };
}

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/**
 * The model's reply, checked: anything of the wrong type becomes empty,
 * text is trimmed and cut to a sane length, and at most 30 items are kept.
 * Null when it isn't an object at all.
 */
export function checkReading(value: unknown): ReceiptReading | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  const items = Array.isArray(v.items) ? v.items : [];
  return {
    isReceipt: v.isReceipt === true,
    merchant: text(v.merchant, 100),
    date: text(v.date, 10),
    total: text(v.total, 20),
    currency: text(v.currency, 3).toUpperCase(),
    category: text(v.category, 40),
    items: items
      .slice(0, 30)
      .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
      .map((i) => ({ name: text(i.name, 60), amount: text(i.amount, 20) }))
      .filter((i) => i.name !== ""),
  };
}

/** "YYYY-MM-DD" that is a real calendar day. */
function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return utc.getUTCFullYear() === y && utc.getUTCMonth() === m - 1 && utc.getUTCDate() === d;
}

export type ReceiptDraft = {
  /** A new expense, filled in for the user to check in the form. */
  transaction: Transaction;
  /** Whether the amount could be read (if not, the form starts at 0). */
  amountRead: boolean;
  /** What to double-check, in plain words. */
  warnings: string[];
};

/**
 * A draft expense from a reading. The account is one in the receipt's
 * currency (the main currency's first, then any), the date is the
 * receipt's unless it's unreadable or in the future (then today), and the
 * category is the one the model chose if the user has it, else "Other".
 * Everything doubtful becomes a warning instead of a guess.
 */
export function receiptDraft(
  reading: ReceiptReading,
  data: { accounts: Account[]; categories: Category[]; mainCurrency: string; today: string },
): ReceiptDraft {
  const warnings: string[] = [];
  if (!reading.isReceipt) warnings.push("This doesn't look like a receipt. Check every field.");

  const open = data.accounts.filter((a) => !a.archived);
  let currency = data.mainCurrency;
  if (reading.currency && isSupportedCurrency(reading.currency)) {
    currency = reading.currency;
  } else {
    warnings.push(`The currency couldn't be read, so ${data.mainCurrency} is assumed.`);
  }
  const account =
    open.find((a) => a.currency === currency && a.currency === data.mainCurrency) ??
    open.find((a) => a.currency === currency);
  if (!account && currency !== data.mainCurrency) {
    warnings.push(
      `The receipt is in ${currency}, but you have no ${currency} account: add one on the Accounts page first, or the amount will be recorded in your account's currency.`,
    );
  }

  const amountMinor = parseAmount(reading.total, currency);
  if (amountMinor === null) warnings.push("The total couldn't be read: enter the amount.");

  let date = data.today;
  if (isDate(reading.date) && reading.date <= addDays(data.today, 1)) {
    date = reading.date;
  } else {
    warnings.push(reading.date ? `The date (${reading.date}) looks wrong, so today is used.` : "The date couldn't be read, so today is used.");
  }

  const spending = data.categories.filter((c) => c.kind === "expense" && !c.archived);
  const category =
    spending.find((c) => c.name === reading.category) ?? spending.find((c) => c.name === "Other") ?? spending[0];

  const description = reading.merchant.slice(0, MAX_DESCRIPTION_LENGTH) || undefined;
  return {
    transaction: {
      id: newTransactionId(),
      type: "expense",
      amount: { amountMinor: amountMinor ?? 0, currency: account?.currency ?? currency },
      category: category?.name ?? "Other",
      ...(category && { categoryId: category.id }),
      date,
      ...(description && { description }),
      note: "From a scanned receipt",
      ...(account && { accountId: account.id }),
    },
    amountRead: amountMinor !== null,
    warnings,
  };
}

/**
 * Transactions that look like the same receipt already recorded: an expense
 * of the same amount and currency within a day of it. Shown as a warning,
 * never blocking: two identical coffees on one day are possible.
 */
export function possibleDuplicates(draft: Transaction, transactions: Transaction[]): Transaction[] {
  if (draft.amount.amountMinor === 0) return [];
  const from = addDays(draft.date, -1);
  const to = addDays(draft.date, 1);
  return transactions.filter(
    (t) =>
      t.type === "expense" &&
      t.amount.currency === draft.amount.currency &&
      t.amount.amountMinor === draft.amount.amountMinor &&
      t.date >= from &&
      t.date <= to,
  );
}

/** "Carrefour, 12 Oct, AED 125.50" for a duplicate warning. */
export function describeTransaction(t: Transaction): string {
  return [t.description ?? t.category, t.date, formatMoney(t.amount)].join(", ");
}
