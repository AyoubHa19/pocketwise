import { describe, expect, it } from "vitest";
import { csvFileName, transactionsToCsv, userText } from "@/lib/csv";
import type { Transaction } from "@/lib/transactions";

const BOM = "﻿";

const t = (over: Partial<Transaction>): Transaction => ({
  id: "x",
  type: "expense",
  amount: { amountMinor: 450, currency: "EUR" },
  category: "Food",
  date: "2026-10-13",
  ...over,
});

describe("transactionsToCsv", () => {
  it("writes a header and one row per transaction, with signed amounts", () => {
    const csv = transactionsToCsv([
      t({ note: "Coffee" }),
      t({ type: "income", category: "Salary", amount: { amountMinor: 520000, currency: "MAD" }, date: "2026-10-01" }),
    ]);
    expect(csv).toBe(
      BOM +
        "Date,Type,Category,Description,Amount,Currency,Account,To account,Note,Tags\r\n" +
        "2026-10-13,expense,Food,,-4.50,EUR,,,Coffee,\r\n" +
        "2026-10-01,income,Salary,,5200.00,MAD,,,,\r\n",
    );
  });

  it("names the account, and a transfer's two ends with an unsigned amount", () => {
    const names = new Map([["bank", "CIH Bank"], ["cash", "Cash"]]);
    const csv = transactionsToCsv(
      [
        t({ accountId: "cash", note: "Coffee" }),
        t({ type: "transfer", category: "Transfer", accountId: "bank", toAccountId: "cash", amount: { amountMinor: 50000, currency: "EUR" } }),
      ],
      names,
    );
    expect(csv).toContain("2026-10-13,expense,Food,,-4.50,EUR,Cash,,Coffee,\r\n");
    expect(csv).toContain("2026-10-13,transfer,Transfer,,500.00,EUR,CIH Bank,Cash,,\r\n");
  });

  it("defuses an account name that looks like a formula", () => {
    const csv = transactionsToCsv([t({ accountId: "a" })], new Map([["a", "=cmd()"]]));
    expect(csv).toContain(",'=cmd(),,");
  });

  it("uses each currency's own decimals", () => {
    const csv = transactionsToCsv([
      t({ amount: { amountMinor: 1500, currency: "JPY" } }),
      t({ amount: { amountMinor: 1234, currency: "KWD" } }),
    ]);
    expect(csv).toContain(",-1500,JPY,");
    expect(csv).toContain(",-1.234,KWD,");
  });

  it("is just the header when there are no transactions", () => {
    expect(transactionsToCsv([])).toBe(
      BOM + "Date,Type,Category,Description,Amount,Currency,Account,To account,Note,Tags\r\n",
    );
  });

  it("keeps notes with commas, quotes and line breaks in one field", () => {
    const csv = transactionsToCsv([t({ note: 'Lunch, "big" one\nwith Sam' })]);
    expect(csv).toContain(',"Lunch, ""big"" one\nwith Sam",\r\n');
  });

  it("keeps Arabic and accents as they are", () => {
    expect(transactionsToCsv([t({ note: "قهوة café" })])).toContain(",قهوة café,\r\n");
  });

  it("writes the description and the tags, made safe like notes", () => {
    const csv = transactionsToCsv([
      t({ description: "Carrefour, Maarif", tags: ["trip", "family"] }),
      t({ category: "=HYPERLINK()", description: "+1", tags: ["-x"] }),
    ]);
    expect(csv).toContain('2026-10-13,expense,Food,"Carrefour, Maarif",-4.50,EUR,,,,trip; family\r\n');
    expect(csv).toContain("2026-10-13,expense,'=HYPERLINK(),'+1,-4.50,EUR,,,,'-x\r\n");
  });
});

describe("userText", () => {
  it.each([
    ["=SUM(A1:A9)", "'=SUM(A1:A9)"],
    ["+1", "'+1"],
    ["-2+3", "'-2+3"],
    ["@cmd", "'@cmd"],
  ])("defuses %j so it can't run as a formula", (value, expected) => {
    expect(userText(value)).toBe(expected);
  });

  it("quotes a defused value that also needs quoting", () => {
    expect(userText('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
  });

  it("leaves ordinary text alone", () => {
    expect(userText("Coffee with Sam")).toBe("Coffee with Sam");
    expect(userText("")).toBe("");
  });
});

describe("csvFileName", () => {
  it("names the file after the day", () => {
    expect(csvFileName("2026-10-13")).toBe("pocketwise-transactions-2026-10-13.csv");
  });
});
