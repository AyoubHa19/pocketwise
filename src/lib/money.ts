/**
 * An amount of money in one currency.
 *
 * `amountMinor` is a whole number in the currency's smallest unit
 * (cents for USD, yen for JPY, fils for KWD), so 19.99 USD is 1999.
 * Whole numbers avoid the rounding errors of decimals (0.1 + 0.2 !== 0.3).
 */
export type Money = {
  amountMinor: number;
  /** ISO 4217 currency code, e.g. "USD", "EUR", "MAD", "JPY". */
  currency: string;
};

/** Currencies offered in the form for now. Any ISO 4217 code works. */
export const CURRENCIES = ["USD", "EUR", "GBP", "MAD", "JPY"] as const;

/** How many decimal places a currency uses: 2 for USD, 0 for JPY, 3 for KWD. */
export function currencyDecimals(currency: string): number {
  return new Intl.NumberFormat("en", { style: "currency", currency })
    .resolvedOptions().maximumFractionDigits ?? 2;
}

/** Formats money for display, e.g. { 1999, "USD" } becomes "$19.99". */
export function formatMoney(money: Money, locale = "en-US"): string {
  if (!Number.isSafeInteger(money.amountMinor)) {
    throw new Error(
      `amountMinor must be a whole number, got ${money.amountMinor}`,
    );
  }
  const decimals = currencyDecimals(money.currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
  }).format(money.amountMinor / 10 ** decimals);
}

/**
 * The amount as plain text for a form field: { 1999, "USD" } becomes "19.99".
 * The opposite of parseAmount, and like it, it works on digits, not decimals.
 */
export function amountToInputText(money: Money): string {
  const decimals = currencyDecimals(money.currency);
  const digits = String(money.amountMinor);
  if (decimals === 0) return digits;
  const padded = digits.padStart(decimals + 1, "0");
  return `${padded.slice(0, -decimals)}.${padded.slice(-decimals)}`;
}

/**
 * Turns what the user typed, like "19.99" or "19,99", into minor units (1999).
 * It works on the text itself rather than multiplying decimals, so no
 * rounding error can creep in. Returns null unless the text is a plain amount
 * greater than zero with at most the currency's number of decimals.
 */
export function parseAmount(input: string, currency: string): number | null {
  const match = /^(\d+)(?:[.,](\d*))?$/.exec(input.trim());
  if (!match) return null;
  const [, whole, fraction = ""] = match;
  const decimals = currencyDecimals(currency);
  if (fraction.length > decimals) return null;
  const amountMinor = Number(whole + fraction.padEnd(decimals, "0"));
  return Number.isSafeInteger(amountMinor) && amountMinor > 0
    ? amountMinor
    : null;
}
