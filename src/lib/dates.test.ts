import { afterEach, describe, expect, it, vi } from "vitest";
import { addMonths, formatMonth, monthOf, todayISODate } from "@/lib/dates";

const originalTimeZone = process.env.TZ;

afterEach(() => {
  vi.useRealTimers();
  process.env.TZ = originalTimeZone;
});

describe("todayISODate", () => {
  it("uses the user's time zone, not UTC", () => {
    vi.useFakeTimers();
    // 20:00 UTC on 13 October is already 05:00 on 14 October in Tokyo.
    vi.setSystemTime(new Date("2026-10-13T20:00:00Z"));
    process.env.TZ = "Asia/Tokyo";
    expect(todayISODate()).toBe("2026-10-14");

    // And still 13:00 on 13 October in Los Angeles.
    process.env.TZ = "America/Los_Angeles";
    expect(todayISODate()).toBe("2026-10-13");
  });

  it("pads single-digit months and days", () => {
    vi.useFakeTimers();
    process.env.TZ = "UTC";
    vi.setSystemTime(new Date("2026-03-05T12:00:00Z"));
    expect(todayISODate()).toBe("2026-03-05");
  });
});

describe("monthOf", () => {
  it("takes the year and month of a date", () => {
    expect(monthOf("2026-10-13")).toBe("2026-10");
  });
});

describe("addMonths", () => {
  it.each([
    ["2026-10", 1, "2026-11"],
    ["2026-12", 1, "2027-01"],
    ["2026-01", -1, "2025-12"],
    ["2026-10", -10, "2025-12"],
    ["2026-10", 15, "2028-01"],
    ["2026-10", 0, "2026-10"],
  ])("%s plus %i months is %s", (month, count, expected) => {
    expect(addMonths(month, count)).toBe(expected);
  });
});

describe("formatMonth", () => {
  it("writes the month name and year", () => {
    expect(formatMonth("2026-10")).toBe("October 2026");
    expect(formatMonth("2027-01")).toBe("January 2027");
  });

  it("follows the locale", () => {
    expect(formatMonth("2026-10", "fr-FR")).toBe("octobre 2026");
  });

  it.each(["Pacific/Honolulu", "America/Los_Angeles", "Asia/Tokyo", "Pacific/Kiritimati"])(
    "shows the same month in %s",
    (timeZone) => {
      process.env.TZ = timeZone;
      expect(formatMonth("2026-10")).toBe("October 2026");
    },
  );
});
