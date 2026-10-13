import { describe, expect, it } from "vitest";
import {
  amountToInputText,
  currencyDecimals,
  currencyOptions,
  formatMoney,
  isSupportedCurrency,
  parseAmount,
} from "@/lib/money";

// Intl puts special non-breaking spaces in some formats (like "1.234,56 €"),
// so turn every kind of space into a plain one before comparing.
const plainSpaces = (text: string) => text.replace(/\s/g, " ");

describe("currencyDecimals", () => {
  it.each([
    ["USD", 2],
    ["MAD", 2],
    ["JPY", 0],
    ["KWD", 3],
  ])("%s uses %i decimals", (currency, decimals) => {
    expect(currencyDecimals(currency)).toBe(decimals);
  });
});

describe("formatMoney", () => {
  it.each([
    [1999, "USD", "$19.99"],
    [200000, "JPY", "¥200,000"],
    [1234, "KWD", "KWD 1.234"],
    [45050, "MAD", "MAD 450.50"],
    [-1250, "EUR", "-€12.50"],
    [0, "USD", "$0.00"],
  ])("formats %i %s as %s", (amountMinor, currency, expected) => {
    expect(plainSpaces(formatMoney({ amountMinor, currency }))).toBe(expected);
  });

  it("follows the locale's way of writing numbers", () => {
    const euros = formatMoney({ amountMinor: 123456, currency: "EUR" }, "de-DE");
    expect(plainSpaces(euros)).toBe("1.234,56 €");
  });

  it("refuses an amount that isn't a whole number of minor units", () => {
    expect(() => formatMoney({ amountMinor: 19.99, currency: "USD" })).toThrow(
      "whole number",
    );
  });
});

describe("parseAmount", () => {
  it.each([
    ["19.99", "USD", 1999],
    ["19,99", "EUR", 1999],
    ["5", "USD", 500],
    ["5.", "USD", 500],
    ["0.1", "USD", 10],
    [" 42 ", "MAD", 4200],
    ["2000", "JPY", 2000],
    ["1.234", "KWD", 1234],
  ])("reads %j in %s as %i", (input, currency, expected) => {
    expect(parseAmount(input, currency)).toBe(expected);
  });

  it.each([
    ["2000.5", "JPY", "decimals the currency doesn't have"],
    ["19.999", "USD", "more decimals than the currency has"],
    ["0", "USD", "zero"],
    ["-5", "USD", "a negative amount"],
    ["abc", "USD", "text"],
    ["", "USD", "nothing"],
    ["1,234.56", "USD", "a thousands separator"],
    ["99999999999999999", "USD", "a number too big to store exactly"],
  ])("rejects %j in %s (%s)", (input, currency) => {
    expect(parseAmount(input, currency)).toBeNull();
  });
});

describe("amountToInputText", () => {
  it.each([
    [1999, "USD", "19.99"],
    [5, "USD", "0.05"],
    [100, "USD", "1.00"],
    [2000, "JPY", "2000"],
    [1234, "KWD", "1.234"],
    [7, "KWD", "0.007"],
  ])("writes %i %s as %j", (amountMinor, currency, expected) => {
    expect(amountToInputText({ amountMinor, currency })).toBe(expected);
  });

  it.each([
    [1999, "USD"],
    [5, "USD"],
    [250000, "MAD"],
    [2000, "JPY"],
    [7, "KWD"],
  ])("gives text that parseAmount reads back as %i %s", (amountMinor, currency) => {
    const text = amountToInputText({ amountMinor, currency });
    expect(parseAmount(text, currency)).toBe(amountMinor);
  });
});

describe("currencyOptions", () => {
  it("lists currencies with their English names, sorted by name", () => {
    const options = currencyOptions();
    expect(options).toContainEqual({ code: "MAD", name: "Moroccan Dirham" });
    const names = options.map((option) => option.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("knows real currency codes and nothing else", () => {
    expect(isSupportedCurrency("MAD")).toBe(true);
    expect(isSupportedCurrency("XYZ")).toBe(false);
    expect(isSupportedCurrency("mad")).toBe(false);
    expect(isSupportedCurrency("")).toBe(false);
  });
});
