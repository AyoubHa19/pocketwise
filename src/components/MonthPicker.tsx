"use client";

import * as m from "motion/react-m";
import { colorTransition, pressable } from "@/components/formStyles";
import { addMonths, formatMonth } from "@/lib/dates";
import { monthSlide } from "@/lib/motion";

type Props = {
  /** The month shown, written "YYYY-MM". */
  month: string;
  /** Today's month, for the "Back to this month" button. */
  currentMonth: string;
  /** Which way the last change went (1 later, -1 earlier, 0 none yet). */
  direction: number;
  onChange: (month: string) => void;
};

const arrowClass = `flex h-11 w-11 items-center justify-center rounded-control border border-line-strong bg-surface text-lg hover:bg-surface-muted ${pressable}`;

export function MonthPicker({
  month,
  currentMonth,
  direction,
  onChange,
}: Props) {
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
          {/* A new key per month: the name slides in from the side you
              moved to. The first one simply appears. */}
          <m.span
            key={month}
            custom={direction}
            variants={monthSlide}
            initial={direction === 0 ? false : "enter"}
            animate="center"
            className="inline-block"
          >
            {formatMonth(month)}
          </m.span>
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
