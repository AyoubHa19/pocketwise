import { ConvexError } from "convex/values";
import { isSupportedCurrency } from "../src/lib/money";
import { isOpeningBalance, type OpeningBalance } from "../src/lib/summary";
import { isTransaction, type Transaction } from "../src/lib/transactions";

// The server checks everything again, with the same rules the app uses
// (shared from src/lib), plus a few the app's forms enforce but a request
// sent straight to Convex could skip. Anything that fails is refused with a
// message; nothing is ever saved half-right.

const MAX_ID_LENGTH = 100;
const MAX_NOTE_LENGTH = 100; // The note field's maxLength in the form.

/** "YYYY-MM-DD" that is a real calendar day: 2026-02-30 is refused. */
export function isCalendarDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

/** Throws unless `value` is a transaction the server will store. */
export function checkTransaction(value: unknown): Transaction {
  if (!isTransaction(value)) {
    throw new ConvexError("That transaction isn't complete or valid.");
  }
  if (value.id.length === 0 || value.id.length > MAX_ID_LENGTH) {
    throw new ConvexError("That transaction's id isn't valid.");
  }
  if (!isSupportedCurrency(value.amount.currency)) {
    throw new ConvexError(`${value.amount.currency} isn't a known currency.`);
  }
  // The category itself is checked against the user's own categories when
  // it's saved (categories.ts); a transfer's is always "Transfer"
  // (isTransaction checks that).
  if (!isCalendarDate(value.date)) {
    throw new ConvexError(`${value.date} isn't a real date.`);
  }
  if (value.note !== undefined && value.note.length > MAX_NOTE_LENGTH) {
    throw new ConvexError(`A note can be up to ${MAX_NOTE_LENGTH} characters.`);
  }
  return value;
}

/** Throws unless `value` is an opening balance the server will store. */
export function checkOpeningBalance(value: unknown): OpeningBalance {
  if (!isOpeningBalance(value)) {
    throw new ConvexError("That starting balance isn't complete or valid.");
  }
  if (!isSupportedCurrency(value.currency)) {
    throw new ConvexError(`${value.currency} isn't a known currency.`);
  }
  if (!isCalendarDate(value.date)) {
    throw new ConvexError(`${value.date} isn't a real date.`);
  }
  return value;
}

/** Throws unless `code` is a currency the app offers. */
export function checkCurrency(code: string): string {
  if (!isSupportedCurrency(code)) {
    throw new ConvexError(`${code} isn't a known currency.`);
  }
  return code;
}
