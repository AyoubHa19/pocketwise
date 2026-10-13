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

/** The day `count` days after a "YYYY-MM-DD" date; negative goes back. */
export function addDays(date: string, count: number): string {
  const [year, month, day] = date.split("-").map(Number);
  // Date.UTC handles month and year ends (Oct 31 + 1 is Nov 1), and working
  // in UTC means no time zone or clock change can skip or repeat a day.
  return new Date(Date.UTC(year, month - 1, day + count))
    .toISOString()
    .slice(0, 10);
}

/**
 * A day heading for lists: "Today", "Yesterday", or "Mon, Oct 12", with
 * the year added for days in another year than `today`.
 */
export function formatDayLabel(
  date: string,
  today: string,
  locale = "en-US",
): string {
  if (date === today) return "Today";
  if (date === addDays(today, -1)) return "Yesterday";
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: date.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** A short month name for chart labels, e.g. "2026-10" → "Oct". */
export function formatMonthShort(month: string, locale = "en-US"): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
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
