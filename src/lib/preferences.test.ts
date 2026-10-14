import { describe, expect, it } from "vitest";
import { DATE_ORDERS, DEFAULT_PREFERENCES, formatDay, isTheme } from "@/lib/preferences";

describe("formatDay", () => {
  const today = "2026-10-14";

  it("writes each format", () => {
    expect(formatDay("2026-10-05", today, "day-first")).toBe("Mon 5 Oct");
    expect(formatDay("2026-10-05", today, "month-first")).toBe("Mon, Oct 5");
    expect(formatDay("2026-10-05", today, "numeric")).toBe("05/10/2026");
  });

  it("adds the year only for other years, except numbers, which always have it", () => {
    // British English puts a comma after the weekday once there's a year.
    expect(formatDay("2025-12-31", today, "day-first")).toBe("Wed, 31 Dec 2025");
    expect(formatDay("2025-12-31", today, "month-first")).toBe("Wed, Dec 31, 2025");
    expect(formatDay("2025-12-31", today, "numeric")).toBe("31/12/2025");
  });

  it("still says Today and Yesterday in every format", () => {
    for (const order of DATE_ORDERS) {
      expect(formatDay(today, today, order)).toBe("Today");
      expect(formatDay("2026-10-13", today, order)).toBe("Yesterday");
    }
  });

  it("gets Yesterday right across a month and a year", () => {
    expect(formatDay("2026-09-30", "2026-10-01", "numeric")).toBe("Yesterday");
    expect(formatDay("2025-12-31", "2026-01-01", "numeric")).toBe("Yesterday");
  });

  it("is day first for anyone who never chose", () => {
    expect(DEFAULT_PREFERENCES.dateOrder).toBe("day-first");
  });
});

describe("isTheme", () => {
  it.each(["system", "light", "dark"])("accepts %s", (value) => {
    expect(isTheme(value)).toBe(true);
  });

  it.each(["", "Dark", "neon", undefined, null, 1])("refuses %j", (value) => {
    expect(isTheme(value)).toBe(false);
  });
});
