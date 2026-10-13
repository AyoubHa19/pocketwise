"use client";

import { useInView, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useRef } from "react";
import { cardClass } from "@/components/formStyles";
import { formatMonth, formatMonthShort } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { barTransition } from "@/lib/motion";
import type { MonthTotals } from "@/lib/summary";

type Props = {
  /** From monthlyTotals: oldest first, ending with the selected month. */
  months: MonthTotals[];
  /** The month on screen, highlighted. */
  selectedMonth: string;
  currency: string;
};

// The drawing's own coordinate system. The SVG scales to the card's width;
// the month names are HTML below it, so they stay readable at any size.
const WIDTH = 300;
const HEIGHT = 120;
const BAR_GAP = 3;
const STROKE = 1.5; // The spending bars' outline

/**
 * Income and spending for the last few months, side by side. The bars are
 * hidden from screen readers, which get the same numbers as a table.
 *
 * Income is a solid green bar and spending an outlined grey one. Colour
 * alone isn't enough: measured, the dark-mode green and grey are nearly as
 * light as each other (1.33:1), so to someone who can't see green they'd
 * look the same. Solid against hollow works for everyone, and income is
 * always the left bar of each pair. The legend shows both shapes.
 *
 * Motion: the bars rise from the baseline the first time the chart is on
 * screen, and adjust when a month's totals change. Moving to another month
 * shows a different set of months, so those bars simply appear: sliding
 * one month's bar into another's would suggest a change that didn't happen.
 */
export function MonthlyTrend({ months, selectedMonth, currency }: Props) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduced = useReducedMotion() ?? false;

  const largest = Math.max(
    1,
    ...months.flatMap((month) => [month.incomeMinor, month.spendingMinor]),
  );
  const columnWidth = WIDTH / months.length;
  const barWidth = columnWidth * 0.28;
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency });
  // Bars start at the bottom; SVG's y grows downwards, so a bar of height h
  // starts at HEIGHT - h. Until the chart has been seen, they're drawn flat.
  const realHeight = (amountMinor: number) => (amountMinor / largest) * HEIGHT;
  const shownHeight = (amountMinor: number) => (inView ? realHeight(amountMinor) : 0);
  const flat = { y: HEIGHT, height: 0 };
  // With nothing in any of the months, there are no bars to draw: a bare
  // baseline would look broken, so a sentence explains what will be here.
  const empty = months.every(
    (month) => month.incomeMinor === 0 && month.spendingMinor === 0,
  );

  return (
    <section
      ref={ref}
      aria-labelledby="trend-heading"
      className={`${cardClass} p-5 sm:p-6`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="trend-heading" className="font-semibold">
          Last {months.length} months
        </h2>
        {!empty && (
          <ul aria-hidden="true" className="flex gap-4 text-sm text-muted">
            <li className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-positive" /> Income
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border-[1.5px] border-muted" />{" "}
              Spending
            </li>
          </ul>
        )}
      </div>

      {empty ? (
        <p className="mt-2 text-sm text-muted">
          Your income and spending for the last {months.length} months will
          appear here as you add transactions.
        </p>
      ) : (
        <>
          <div aria-hidden="true" className="mt-4">
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block h-auto w-full">
              {/* One group per set of months: a new set (another month chosen)
                  starts afresh, at its values once the chart has been seen. */}
              <g key={selectedMonth}>
                {months.map((month, index) => {
                  const x = index * columnWidth;
                  const barsStart = x + (columnWidth - (2 * barWidth + BAR_GAP)) / 2;
                  const incomeHeight = shownHeight(month.incomeMinor);
                  const spendingHeight = shownHeight(month.spendingMinor);
                  return (
                    <g key={month.month}>
                      {month.month === selectedMonth && (
                        <rect
                          x={x + 2}
                          y={0}
                          width={columnWidth - 4}
                          height={HEIGHT}
                          rx={6}
                          className="fill-surface-muted"
                        />
                      )}
                      <m.rect
                        x={barsStart}
                        width={barWidth}
                        rx={2}
                        initial={inView ? false : flat}
                        animate={{ y: HEIGHT - incomeHeight, height: incomeHeight }}
                        transition={barTransition(reduced)}
                        className="fill-positive"
                      />
                      {/* Hollow: the outline sits just inside the bar's area, so
                          both bars of a pair are the same size. Whether to draw
                          it depends on its real height, not its height while
                          still flat, or it would appear without rising. */}
                      {realHeight(month.spendingMinor) >= STROKE && (
                        <m.rect
                          x={barsStart + barWidth + BAR_GAP + STROKE / 2}
                          width={barWidth - STROKE}
                          rx={2}
                          strokeWidth={STROKE}
                          initial={inView ? false : flat}
                          animate={{
                            y: HEIGHT - Math.max(spendingHeight, STROKE) + STROKE / 2,
                            height: Math.max(spendingHeight - STROKE, 0),
                          }}
                          transition={barTransition(reduced)}
                          className="fill-transparent stroke-muted"
                        />
                      )}
                    </g>
                  );
                })}
              </g>
              {/* The baseline, so empty months still show where zero is. */}
              <line
                x1={0}
                y1={HEIGHT - 0.5}
                x2={WIDTH}
                y2={HEIGHT - 0.5}
                className="stroke-line-strong"
                strokeWidth={1}
              />
            </svg>
            <div
              className="mt-2 grid text-center text-xs"
              style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}
            >
              {months.map((month) => (
                <span
                  key={month.month}
                  className={
                    month.month === selectedMonth
                      ? "font-semibold text-foreground"
                      : "text-muted"
                  }
                >
                  {formatMonthShort(month.month)}
                </span>
              ))}
            </div>
          </div>

          {/* sr-only goes on a wrapper, not the table: a table ignores the 1px
              width sr-only gives it and stays full size, which stuck out past
              the edge of a phone screen and let the page scroll sideways. */}
          <div className="sr-only">
            <table>
              <caption>
                Income and spending for the last {months.length} months
              </caption>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">Income</th>
                  <th scope="col">Spending</th>
                </tr>
              </thead>
              <tbody>
                {months.map((month) => (
                  <tr key={month.month}>
                    <th scope="row">{formatMonth(month.month)}</th>
                    <td>{money(month.incomeMinor)}</td>
                    <td>{money(month.spendingMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
