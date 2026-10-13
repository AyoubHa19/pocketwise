/**
 * Today's date on the user's device as "YYYY-MM-DD", in their own time zone.
 *
 * Not `new Date().toISOString().slice(0, 10)`: that gives the date in UTC,
 * which is already tomorrow (or still yesterday) for part of the day in
 * most of the world.
 */
export function todayISODate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// Months are written "YYYY-MM", like dates without the day, so the month of
// a date is just its first seven characters.

/** The month a "YYYY-MM-DD" date falls in, e.g. "2026-10-13" → "2026-10". */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** The month `count` months after `month`; a negative count goes back. */
export function addMonths(month: string, count: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  // Count months from year 0, so crossing a new year needs no special case.
  const index = year * 12 + (monthNumber - 1) + count;
  const newYear = Math.floor(index / 12);
  const newMonth = (index % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, "0")}`;
}

/** A month for display, e.g. "2026-10" → "October 2026". */
export function formatMonth(month: string, locale = "en-US"): string {
  const [year, monthNumber] = month.split("-").map(Number);
  // The 1st of the month in UTC, also formatted in UTC, so the user's time
  // zone can't shift it into the month before.
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}
