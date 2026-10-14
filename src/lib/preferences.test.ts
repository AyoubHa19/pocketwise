import { describe, expect, it } from "vitest";
import { formatDayLabel } from "@/lib/dates";
import { DEFAULT_PREFERENCES, dateLocale, isTheme } from "@/lib/preferences";

describe("dateLocale", () => {
  const today = "2026-10-14";

  it("writes month first by default, and day first when chosen", () => {
    expect(formatDayLabel("2026-10-05", today, dateLocale("month-first"))).toBe("Mon, Oct 5");
    expect(formatDayLabel("2026-10-05", today, dateLocale("day-first"))).toBe("Mon 5 Oct");
  });

  it("keeps the year rule in both orders", () => {
    expect(formatDayLabel("2025-12-31", today, dateLocale("month-first"))).toBe("Wed, Dec 31, 2025");
    // British English puts a comma after the weekday once there's a year.
    expect(formatDayLabel("2025-12-31", today, dateLocale("day-first"))).toBe("Wed, 31 Dec 2025");
  });

  it("still says Today and Yesterday in both", () => {
    for (const order of ["month-first", "day-first"] as const) {
      expect(formatDayLabel(today, today, dateLocale(order))).toBe("Today");
      expect(formatDayLabel("2026-10-13", today, dateLocale(order))).toBe("Yesterday");
    }
  });

  it("matches what the app shows when nothing was chosen", () => {
    expect(dateLocale(DEFAULT_PREFERENCES.dateOrder)).toBe("en-US");
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
