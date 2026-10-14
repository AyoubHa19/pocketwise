import { currencyDecimals, isSupportedCurrency, type Money } from "@/lib/money";

// Currency conversion (PRD 11). Rates are entered by the user (from their
// bank, a receipt, a website), each with its date and where it came from;
// Pocketwise never fetches or guesses one, and never claims a rate is live.
//
// The policy, shown wherever converted amounts appear:
// - Original amounts are never changed; a converted figure is always shown
//   as such, beside the rate it used and that rate's date.
// - A conversion uses the user's rate for the pair (in either direction:
//   1 EUR = 4.28 AED also converts AED to EUR, at 1 ÷ 4.28).
// - One rate per pair, the latest the user entered, for every date: the
//   history is not re-priced day by day.
// - With no rate, there's no conversion, and the screen says so.
//
// The arithmetic is exact: the rate is kept as the text the user typed
// ("4.2815"), and amounts are multiplied as whole numbers (BigInt), then
// rounded once, half away from zero, to the target's smallest unit.

export type ExchangeRate = {
  id: string;
  /** 1 `from` = `rate` `to`. */
  from: string;
  to: string;
  /** A decimal written as text, more than zero, up to 6 decimals: "4.2815". */
  rate: string;
  /** The day the rate is from, "YYYY-MM-DD". */
  date: string;
  /** Where it came from, like "My bank"; empty if not given. */
  source: string;
};

export const MAX_RATE_DECIMALS = 6;
export const MAX_SOURCE_LENGTH = 40;
// BigInt(…) rather than literals like 10n, which this project's TypeScript
// target doesn't allow.
const ZERO = BigInt(0);
const TWO = BigInt(2);
const TEN = BigInt(10);
const SCALE = TEN ** BigInt(MAX_RATE_DECIMALS);

/** The rate as a whole number of millionths: "4.2815" → 4281500n. Null if malformed. */
export function rateToScaled(rate: string): bigint | null {
  const match = /^(\d{1,9})(?:\.(\d{1,6}))?$/.exec(rate.trim());
  if (!match) return null;
  const scaled = BigInt(match[1]) * SCALE + BigInt((match[2] ?? "").padEnd(MAX_RATE_DECIMALS, "0"));
  return scaled > ZERO ? scaled : null;
}

/** Divides, rounding half away from zero. */
function divideRounded(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < ZERO !== denominator < ZERO;
  const n = numerator < ZERO ? -numerator : numerator;
  const d = denominator < ZERO ? -denominator : denominator;
  const q = (n * TWO + d) / (d * TWO);
  return negative ? -q : q;
}

/**
 * `amountMinor` of `from` in `to` at `rate` (1 from = rate to), exactly,
 * rounded once to `to`'s smallest unit: 10.00 EUR at 4.2815 is 42.82 AED.
 * `inverse` uses 1 ÷ rate (for a rate entered the other way round).
 */
export function convertMinor(
  amountMinor: number,
  from: string,
  to: string,
  rate: string,
  inverse = false,
): number | null {
  const scaled = rateToScaled(rate);
  if (scaled === null) return null;
  const shift = currencyDecimals(to) - currencyDecimals(from);
  let numerator = BigInt(amountMinor) * (inverse ? SCALE : scaled);
  let denominator = inverse ? scaled : SCALE;
  if (shift >= 0) numerator *= TEN ** BigInt(shift);
  else denominator *= TEN ** BigInt(-shift);
  return Number(divideRounded(numerator, denominator));
}

/** The rate that converts `from` to `to`, in whichever direction it was entered. */
export function findRate(
  rates: ExchangeRate[],
  from: string,
  to: string,
): { rate: ExchangeRate; inverse: boolean } | null {
  const direct = rates.find((r) => r.from === from && r.to === to);
  if (direct) return { rate: direct, inverse: false };
  const reverse = rates.find((r) => r.from === to && r.to === from);
  return reverse ? { rate: reverse, inverse: true } : null;
}

/** `money` in `to`, with the rate used, or null when there's no rate. */
export function convert(
  money: Money,
  to: string,
  rates: ExchangeRate[],
): { amountMinor: number; used: ExchangeRate | null } | null {
  if (money.currency === to) return { amountMinor: money.amountMinor, used: null };
  const found = findRate(rates, money.currency, to);
  if (!found) return null;
  const amountMinor = convertMinor(money.amountMinor, money.currency, to, found.rate.rate, found.inverse);
  return amountMinor === null ? null : { amountMinor, used: found.rate };
}

/**
 * Amounts in several currencies added up in `to`: the total, the rates it
 * used, and the currencies it couldn't convert (no rate), which are left
 * out of the total, never guessed.
 */
export function convertedTotal(
  amounts: Money[],
  to: string,
  rates: ExchangeRate[],
): { amountMinor: number; used: ExchangeRate[]; missing: string[] } {
  let amountMinor = 0;
  const used = new Map<string, ExchangeRate>();
  const missing = new Set<string>();
  for (const money of amounts) {
    const result = convert(money, to, rates);
    if (result === null) {
      missing.add(money.currency);
      continue;
    }
    amountMinor += result.amountMinor;
    if (result.used) used.set(result.used.id, result.used);
  }
  return { amountMinor, used: [...used.values()], missing: [...missing].sort() };
}

/**
 * The transactions with those in other currencies converted to `to` where
 * there's a rate (the copies say what they were, in `convertedFrom`), for
 * reports that include every currency. Ones without a rate stay as they
 * are, so reports in `to` leave them out, and `missing` names them.
 */
export function convertTransactions<T extends { amount: Money }>(
  transactions: T[],
  to: string,
  rates: ExchangeRate[],
): { transactions: (T & { convertedFrom?: Money })[]; used: ExchangeRate[]; missing: string[] } {
  const used = new Map<string, ExchangeRate>();
  const missing = new Set<string>();
  const out = transactions.map((t) => {
    if (t.amount.currency === to) return t;
    const result = convert(t.amount, to, rates);
    if (result === null) {
      missing.add(t.amount.currency);
      return t;
    }
    if (result.used) used.set(result.used.id, result.used);
    return { ...t, amount: { amountMinor: result.amountMinor, currency: to }, convertedFrom: t.amount };
  });
  return { transactions: out, used: [...used.values()], missing: [...missing].sort() };
}

/** "1 EUR = 4.2815 AED" */
export function rateText(rate: Pick<ExchangeRate, "from" | "to" | "rate">): string {
  return `1 ${rate.from} = ${rate.rate.trim()} ${rate.to}`;
}

/** "YYYY-MM-DD" that is a real calendar day. */
function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return utc.getUTCFullYear() === y && utc.getUTCMonth() === m - 1 && utc.getUTCDate() === d;
}

/**
 * What's wrong with these rate values, or null if nothing is. Used by the
 * form and, again, by the server.
 */
export function rateProblem(values: Omit<ExchangeRate, "id">): string | null {
  if (!isSupportedCurrency(values.from) || !isSupportedCurrency(values.to)) return "Choose two currencies.";
  if (values.from === values.to) return "Choose two different currencies.";
  if (rateToScaled(values.rate) === null) {
    return `Enter a rate greater than zero, like 4.28, with up to ${MAX_RATE_DECIMALS} decimals.`;
  }
  if (!isDate(values.date)) return "Pick the date the rate is from.";
  if (values.source.trim().length > MAX_SOURCE_LENGTH) {
    return `Where it's from can be up to ${MAX_SOURCE_LENGTH} characters.`;
  }
  return null;
}
