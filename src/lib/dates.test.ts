import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addDays,
  addMonths,
  formatDayLabel,
  formatMonth,
  formatMonthShort,
  monthOf,
  todayISODate,
} from "@/lib/dates";

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

describe("addDays", () => {
  it.each([
    ["2026-10-13", 1, "2026-10-14"],
    ["2026-10-13", -1, "2026-10-12"],
    ["2026-10-31", 1, "2026-11-01"],
    ["2026-01-01", -1, "2025-12-31"],
    ["2028-02-28", 1, "2028-02-29"], // a leap year
    ["2027-02-28", 1, "2027-03-01"], // not a leap year
    ["2026-10-13", 0, "2026-10-13"],
  ])("%s plus %i days is %s", (date, count, expected) => {
    expect(addDays(date, count)).toBe(expected);
  });

  it("isn't thrown off by daylight saving changes", () => {
    process.env.TZ = "Europe/Paris"; // clocks go back on 25 October 2026
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26");
    expect(addDays("2026-10-26", -1)).toBe("2026-10-25");
  });
});

describe("formatDayLabel", () => {
  const today = "2026-10-13";

  it.each([
    ["2026-10-13", "Today"],
    ["2026-10-12", "Yesterday"],
    ["2026-10-11", "Sun, Oct 11"],
    ["2026-10-01", "Thu, Oct 1"],
    ["2025-12-31", "Wed, Dec 31, 2025"],
  ])("labels %s as %j", (date, expected) => {
    expect(formatDayLabel(date, today)).toBe(expected);
  });

  it("knows yesterday across a month and a year", () => {
    expect(formatDayLabel("2026-09-30", "2026-10-01")).toBe("Yesterday");
    expect(formatDayLabel("2025-12-31", "2026-01-01")).toBe("Yesterday");
  });

  it("shows the same day in every time zone", () => {
    for (const timeZone of ["Pacific/Honolulu", "Asia/Tokyo"]) {
      process.env.TZ = timeZone;
      expect(formatDayLabel("2026-10-11", today)).toBe("Sun, Oct 11");
    }
  });
});

describe("formatMonthShort", () => {
  it.each([
    ["2026-10", "Oct"],
    ["2026-01", "Jan"],
    ["2025-12", "Dec"],
  ])("labels %s as %s", (month, expected) => {
    expect(formatMonthShort(month)).toBe(expected);
  });

  it("isn't moved to another month by the time zone", () => {
    process.env.TZ = "Pacific/Honolulu";
    expect(formatMonthShort("2026-10")).toBe("Oct");
  });
});
