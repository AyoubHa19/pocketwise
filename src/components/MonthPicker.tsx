import { addMonths, formatMonth } from "@/lib/dates";

type Props = {
  /** The month shown, written "YYYY-MM". */
  month: string;
  /** Today's month, for the "Back to this month" button. */
  currentMonth: string;
  onChange: (month: string) => void;
};

const arrowClass =
  "flex h-11 w-11 items-center justify-center rounded-md border border-zinc-300 text-lg hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900";

export function MonthPicker({ month, currentMonth, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(addMonths(month, -1))}
          aria-label="Previous month"
          className={arrowClass}
        >
          ‹
        </button>
        {/* aria-live makes screen readers announce the new month. The
            minimum width fits the longest English month name, so the arrow
            buttons stay put while you click through the months. */}
        <h2
          aria-live="polite"
          className="min-w-44 text-center text-xl font-semibold"
        >
          {formatMonth(month)}
        </h2>
        <button
          type="button"
          onClick={() => onChange(addMonths(month, 1))}
          aria-label="Next month"
          className={arrowClass}
        >
          ›
        </button>
      </div>
      {month !== currentMonth && (
        <button
          type="button"
          onClick={() => onChange(currentMonth)}
          className="inline-flex min-h-11 items-center text-sm font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Back to this month
        </button>
      )}
    </div>
  );
}
