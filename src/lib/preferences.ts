// The user's display preferences, saved in their account (convex/
// preferences.ts) and shared by the app and the server.

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/** Which comes first in a date like "Mon, Oct 13" or "Mon 13 Oct". */
export const DATE_ORDERS = ["month-first", "day-first"] as const;
export type DateOrder = (typeof DATE_ORDERS)[number];

export type Preferences = { theme: Theme; dateOrder: DateOrder };

/** What a user who never chose gets: the device's theme, and Oct 13. */
export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  dateOrder: "month-first",
};

/**
 * The locale that writes dates in that order. Only the order differs: both
 * are English, so day and month names stay the same.
 */
export function dateLocale(order: DateOrder): string {
  return order === "day-first" ? "en-GB" : "en-US";
}

/**
 * The cookie that lets the server draw the page in the chosen theme from
 * the first paint, before the account's preferences have loaded.
 */
export const THEME_COOKIE = "pocketwise-theme";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}
