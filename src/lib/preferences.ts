// The user's display preferences, saved in their account (convex/
// preferences.ts) and shared by the app and the server.

import { addDays, formatDayLabel } from "@/lib/dates";

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/**
 * How dates are written: "Mon 13 Oct" (day first), "Mon, Oct 13" (month
 * first) or "13/10/2026" (numbers, day first). Stored as `dateOrder`.
 */
export const DATE_ORDERS = ["day-first", "month-first", "numeric"] as const;
export type DateOrder = (typeof DATE_ORDERS)[number];

/** The day weeks start on, in the calendar (PRD 3: it must be configurable). */
export const WEEK_STARTS = ["monday", "sunday", "saturday"] as const;
export type WeekStart = (typeof WEEK_STARTS)[number];

export type Preferences = { theme: Theme; dateOrder: DateOrder; weekStart: WeekStart };

/** What a user who never chose gets: the device's theme, 13 Oct, and Monday. */
export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  dateOrder: "day-first",
  weekStart: "monday",
};

/**
 * A calendar day ("YYYY-MM-DD") as a heading, in the user's format. Today
 * and yesterday are words in every format, since they read fastest. The
 * year shows only when it isn't this year, except in numbers, which always
 * have it. Dates are read in UTC so the day never shifts with time zones.
 */
export function formatDay(date: string, today: string, order: DateOrder): string {
  if (order !== "numeric") {
    // Same words in both: only the order differs (en-GB day first, en-US month first).
    return formatDayLabel(date, today, order === "day-first" ? "en-GB" : "en-US");
  }
  if (date === today) return "Today";
  if (date === addDays(today, -1)) return "Yesterday";
  // "YYYY-MM-DD" rearranged: the digits are already two wide and in UTC.
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * The cookie that lets the server draw the page in the chosen theme from
 * the first paint, before the account's preferences have loaded.
 */
export const THEME_COOKIE = "pocketwise-theme";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}
