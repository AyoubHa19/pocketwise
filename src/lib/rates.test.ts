import { describe, expect, it } from "vitest";
import {
  convert,
  convertedTotal,
  convertMinor,
  convertTransactions,
  findRate,
  rateProblem,
  rateText,
  rateToScaled,
  type ExchangeRate,
} from "@/lib/rates";

const eur: ExchangeRate = { id: "eur", from: "EUR", to: "AED", rate: "4.2815", date: "2026-10-14", source: "My bank" };
const jpy: ExchangeRate = { id: "jpy", from: "AED", to: "JPY", rate: "40.5", date: "2026-10-01", source: "" };

describe("rateToScaled", () => {
  it("reads the typed decimal exactly", () => {
    expect(rateToScaled("4.2815")).toBe(BigInt(4281500));
    expect(rateToScaled("4")).toBe(BigInt(4000000));
    expect(rateToScaled(" 0.000001 ")).toBe(BigInt(1));
  });

  it("refuses zero, signs, too many decimals and anything else", () => {
    for (const bad of ["0", "0.000000", "-4", "4.1234567", "4,28", "", "abc", "1e3"]) {
      expect(rateToScaled(bad)).toBeNull();
    }
  });
});

describe("convertMinor", () => {
  it("multiplies exactly and rounds once to the target's unit", () => {
    expect(convertMinor(1000, "EUR", "AED", "4.2815")).toBe(4282); // 42.815 → 42.82
    expect(convertMinor(1, "EUR", "AED", "4.2815")).toBe(4); // 0.042815 → 0.04
    expect(convertMinor(-1000, "EUR", "AED", "4.2815")).toBe(-4282); // half away from zero
  });

  it("handles currencies with different decimals", () => {
    expect(convertMinor(10000, "AED", "JPY", "40.5")).toBe(4050); // 100.00 AED → 4,050 JPY
    expect(convertMinor(4050, "JPY", "AED", "40.5", true)).toBe(10000); // and back, at 1 ÷ 40.5
    expect(convertMinor(1000, "KWD", "AED", "12")).toBe(1200); // 1.000 KWD → 12.00 AED
  });

  it("goes the other way at 1 ÷ rate", () => {
    expect(convertMinor(4282, "AED", "EUR", "4.2815", true)).toBe(1000); // 42.82 ÷ 4.2815 = 10.0012 → 10.00
  });

  it("never loses precision on big amounts", () => {
    // 90 trillion minor units would lose cents as a float × rate.
    expect(convertMinor(9_000_000_000_000_000 / 100, "EUR", "AED", "4.2815")).toBe(385_335_000_000_000);
  });
});

describe("findRate and convert", () => {
  it("finds a rate in either direction, and says when there's none", () => {
    expect(findRate([eur], "EUR", "AED")).toEqual({ rate: eur, inverse: false });
    expect(findRate([eur], "AED", "EUR")).toEqual({ rate: eur, inverse: true });
    expect(findRate([eur], "USD", "AED")).toBeNull();
    expect(convert({ amountMinor: 500, currency: "AED" }, "AED", [])).toEqual({ amountMinor: 500, used: null });
    expect(convert({ amountMinor: 500, currency: "USD" }, "AED", [eur])).toBeNull();
  });
});

describe("convertedTotal", () => {
  it("adds what it can convert, names the rates used and what had none", () => {
    expect(
      convertedTotal(
        [
          { amountMinor: 600000, currency: "AED" },
          { amountMinor: 10000, currency: "EUR" },
          { amountMinor: 5000, currency: "USD" },
        ],
        "AED",
        [eur],
      ),
    ).toEqual({ amountMinor: 600000 + 42815, used: [eur], missing: ["USD"] });
  });
});

describe("convertTransactions", () => {
  it("converts what it can, saying what each was, and leaves the rest as it is", () => {
    const list = [
      { id: "a", amount: { amountMinor: 10000, currency: "EUR" } },
      { id: "b", amount: { amountMinor: 500, currency: "AED" } },
      { id: "c", amount: { amountMinor: 700, currency: "USD" } },
    ];
    const result = convertTransactions(list, "AED", [eur]);
    expect(result.transactions).toEqual([
      { id: "a", amount: { amountMinor: 42815, currency: "AED" }, convertedFrom: { amountMinor: 10000, currency: "EUR" } },
      list[1],
      list[2],
    ]);
    expect(result.used).toEqual([eur]);
    expect(result.missing).toEqual(["USD"]);
  });
});

describe("rateText and rateProblem", () => {
  it("writes a rate plainly", () => {
    expect(rateText(eur)).toBe("1 EUR = 4.2815 AED");
  });

  it("accepts a good rate, refuses bad ones", () => {
    const values = { from: "EUR", to: "AED", rate: "4.28", date: "2026-10-14", source: "" };
    expect(rateProblem(values)).toBeNull();
    expect(rateProblem({ ...values, to: "EUR" })).toMatch("two different currencies");
    expect(rateProblem({ ...values, from: "XYZ" })).toMatch("Choose two currencies");
    expect(rateProblem({ ...values, rate: "0" })).toMatch("greater than zero");
    expect(rateProblem({ ...values, date: "2026-02-30" })).toMatch("date the rate is from");
    expect(rateProblem({ ...values, source: "x".repeat(41) })).toMatch("up to 40");
  });
});
