"use client";

import { useInView, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useId, useRef } from "react";
import { cardClass } from "@/components/formStyles";
import { smoothPath } from "@/lib/chart";
import { formatMonth, formatMonthShort } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { duration, ease } from "@/lib/motion";
import type { MonthTotals } from "@/lib/summary";

type Props = {
  /** From monthlyTotals: oldest first, ending with the selected month. */
  months: MonthTotals[];
  /** The month on screen, marked on the chart. */
  selectedMonth: string;
  currency: string;
  className: string;
};

// The drawing's own coordinates. It stretches to the card's width; lines
// keep their thickness (non-scaling-stroke), and the month names are HTML
// below it, so they stay readable at any size.
const WIDTH = 600;
const HEIGHT = 180;
const TOP = 12; // Room above the highest point, for the line's thickness.

/**
 * Income and spending over the last six months as two smooth lines. They
 * differ in more than colour: income is a sage line over a shaded area,
 * spending a black line without one, and the legend shows both. Screen
 * readers get the same numbers as a table.
 *
 * Motion: the lines are uncovered from the left the first time the chart
 * is on screen (or simply appear, with reduced motion). It's a widening
 * clip rather than drawing the line's length, which can't work with lines
 * that keep their thickness as the chart stretches. Another month
 * shows another set of months, which appear straight away: morphing one
 * set's lines into another's would suggest changes that didn't happen.
 */
export function CashFlowChart({ months, selectedMonth, currency, className }: Props) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduced = useReducedMotion() ?? false;
  const gradientId = useId();
  const clipId = useId();
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency });

  const largest = Math.max(1, ...months.flatMap((m) => [m.incomeMinor, m.spendingMinor]));
  const x = (index: number) => (index / Math.max(1, months.length - 1)) * WIDTH;
  const y = (amountMinor: number) => HEIGHT - (amountMinor / largest) * (HEIGHT - TOP);
  const income = smoothPath(months.map((m, i) => ({ x: x(i), y: y(m.incomeMinor) })));
  const spending = smoothPath(months.map((m, i) => ({ x: x(i), y: y(m.spendingMinor) })));
  const selectedIndex = months.findIndex((m) => m.month === selectedMonth);
  const selected = months[selectedIndex];
  const empty = months.every((m) => m.incomeMinor === 0 && m.spendingMinor === 0);

  return (
    <section ref={ref} aria-labelledby="cash-flow-heading" className={`${cardClass} flex flex-col p-5 sm:p-6 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div>
          <h2 id="cash-flow-heading" className="font-semibold">
            Cash flow
          </h2>
          <p className="text-sm text-muted">The last {months.length} months</p>
        </div>
        {!empty && (
          <ul aria-hidden="true" className="flex gap-4 pt-0.5 text-sm text-muted">
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-5 rounded-full bg-accent" /> Income
            </li>
            <li className="flex items-center gap-2">
              <span className="h-0.5 w-5 rounded-full bg-ink" /> Spending
            </li>
          </ul>
        )}
      </div>

      {empty ? (
        <p className="mt-2 text-sm text-muted">
          Your income and spending for the last {months.length} months will appear here as you add transactions.
        </p>
      ) : (
        <>
          {selected && (
            <p className="mt-3 text-sm text-muted">
              {formatMonthShort(selected.month)}:{" "}
              <span className="font-medium text-positive tabular-nums">{money(selected.incomeMinor)}</span> in ·{" "}
              <span className="font-medium text-foreground tabular-nums">{money(selected.spendingMinor)}</span> out
            </p>
          )}
          <div aria-hidden="true" className="mt-4 flex flex-1 flex-col">
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="block h-40 w-full flex-1 overflow-visible">
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
                <clipPath id={clipId}>
                  {/* Wider than the drawing, so round line ends aren't cut. */}
                  <m.rect
                    x={-10}
                    y={-10}
                    height={HEIGHT + 20}
                    initial={{ width: 0 }}
                    animate={{ width: inView ? WIDTH + 20 : 0 }}
                    transition={reduced ? { duration: 0 } : { duration: duration.slow * 3, ease }}
                  />
                </clipPath>
              </defs>
              {/* Faint guides at a quarter, half and three quarters. */}
              {[0.25, 0.5, 0.75].map((share) => (
                <line
                  key={share}
                  x1={0}
                  x2={WIDTH}
                  y1={TOP + (HEIGHT - TOP) * share}
                  y2={TOP + (HEIGHT - TOP) * share}
                  className="stroke-line"
                  strokeDasharray="4 6"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {selectedIndex >= 0 && (
                <line
                  x1={x(selectedIndex)}
                  x2={x(selectedIndex)}
                  y1={0}
                  y2={HEIGHT}
                  className="stroke-line-strong"
                  strokeDasharray="3 4"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {/* A new key per set of months: another month starts afresh. */}
              <g key={selectedMonth} clipPath={`url(#${clipId})`}>
                <path d={`${income} L${WIDTH} ${HEIGHT} L0 ${HEIGHT} Z`} fill={`url(#${gradientId})`} />
                <path d={income} className="fill-none stroke-accent" strokeWidth={3} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                <path d={spending} className="fill-none stroke-ink" strokeWidth={2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </g>
              <line x1={0} x2={WIDTH} y1={HEIGHT - 0.5} y2={HEIGHT - 0.5} className="stroke-line-strong" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="mt-2 flex justify-between text-xs">
              {months.map((month) => (
                <span key={month.month} className={month.month === selectedMonth ? "font-semibold text-foreground" : "text-muted"}>
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
              <caption>Income and spending for the last {months.length} months</caption>
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
