import { colorTransition, pressable } from "@/components/formStyles";
import { addMonths, formatMonth } from "@/lib/dates";

type Props = {
  /** The month shown, written "YYYY-MM". */
  month: string;
  /** Today's month, for the "Back to this month" button. */
  currentMonth: string;
  onChange: (month: string) => void;
};

const arrowClass = `flex h-11 w-11 items-center justify-center rounded-control border border-line-strong bg-surface text-lg hover:bg-surface-muted ${pressable}`;

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
          className={`inline-flex min-h-11 items-center text-sm font-medium text-muted underline underline-offset-4 hover:text-foreground ${colorTransition}`}
        >
          Back to this month
        </button>
      )}
    </div>
  );
}
