import { amountToInputText } from "@/lib/money";
import { signedAmount, type Transaction } from "@/lib/transactions";

// Exporting transactions as CSV (comma-separated values), which Excel,
// Google Sheets and Numbers all open. The format:
//
// - One row per transaction, newest day first, under a header row:
//   Date, Type, Category, Amount, Currency, Note.
// - Date is "YYYY-MM-DD". Amount is a plain number with a point for
//   decimals and a minus for spending (-4.50), so a column can be summed;
//   it has the currency's own number of decimals (2 for EUR, 0 for JPY).
// - Lines end with CRLF and fields are quoted when they need it, as the
//   CSV standard (RFC 4180) describes. The file starts with a UTF-8 byte
//   order mark, which Excel needs to read accents and Arabic correctly.

export const CSV_HEADER = ["Date", "Type", "Category", "Amount", "Currency", "Note"];

/** Quotes a field if it contains a comma, a quote or a line break. */
function quote(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Text the user typed, made safe for spreadsheets: one starting with
 * = + - @ (or a tab or carriage return) could run as a formula when the
 * file is opened ("CSV injection"), so it gets a leading apostrophe, which
 * spreadsheets show as plain text. Values the app writes itself, like
 * amounts, don't go through this: a minus there must stay a number.
 */
export function userText(value: string): string {
  return quote(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value);
}

/** The CSV text for these transactions, header included. */
export function transactionsToCsv(transactions: Transaction[]): string {
  const rows = transactions.map((t) =>
    [
      t.date,
      t.type,
      quote(t.category),
      amountToInputText(signedAmount(t)),
      t.amount.currency,
      userText(t.note ?? ""),
    ].join(","),
  );
  return "﻿" + [CSV_HEADER.join(","), ...rows].join("\r\n") + "\r\n";
}

/** "pocketwise-transactions-2026-10-13.csv" */
export function csvFileName(today: string): string {
  return `pocketwise-transactions-${today}.csv`;
}
