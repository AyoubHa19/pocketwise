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
