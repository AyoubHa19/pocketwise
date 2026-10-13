import { cardClass } from "@/components/formStyles";
import { formatMonth, formatMonthShort } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { MonthTotals } from "@/lib/summary";

type Props = {
  /** From monthlyTotals: oldest first. */
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
 */
export function MonthlyTrend({ months, selectedMonth, currency }: Props) {
  const largest = Math.max(1, ...months.flatMap((m) => [m.incomeMinor, m.spendingMinor]));
  const columnWidth = WIDTH / months.length;
  const barWidth = columnWidth * 0.28;
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency });
  // Bars start at the bottom; SVG's y grows downwards, so a bar of height h
  // starts at HEIGHT - h.
  const height = (amountMinor: number) => (amountMinor / largest) * HEIGHT;

  return (
    <section aria-labelledby="trend-heading" className={`${cardClass} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="trend-heading" className="font-semibold">
          Last {months.length} months
        </h2>
        <ul aria-hidden="true" className="flex gap-4 text-sm text-muted">
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-positive" /> Income
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border-[1.5px] border-muted" />{" "}
            Spending
          </li>
        </ul>
      </div>

      <div aria-hidden="true" className="mt-4">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block h-auto w-full">
          {months.map((m, index) => {
            const x = index * columnWidth;
            const barsStart = x + (columnWidth - (2 * barWidth + BAR_GAP)) / 2;
            return (
              <g key={m.month}>
                {m.month === selectedMonth && (
                  <rect
                    x={x + 2}
                    y={0}
                    width={columnWidth - 4}
                    height={HEIGHT}
                    rx={6}
                    className="fill-surface-muted"
                  />
                )}
                <rect
                  x={barsStart}
                  y={HEIGHT - height(m.incomeMinor)}
                  width={barWidth}
                  height={height(m.incomeMinor)}
                  rx={2}
                  className="fill-positive"
                />
                {/* Hollow: the outline sits just inside the bar's area, so
                    both bars of a pair are the same size. */}
                {height(m.spendingMinor) >= STROKE && (
                  <rect
                    x={barsStart + barWidth + BAR_GAP + STROKE / 2}
                    y={HEIGHT - height(m.spendingMinor) + STROKE / 2}
                    width={barWidth - STROKE}
                    height={height(m.spendingMinor) - STROKE}
                    rx={2}
                    strokeWidth={STROKE}
                    className="fill-transparent stroke-muted"
                  />
                )}
              </g>
            );
          })}
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
          {months.map((m) => (
            <span
              key={m.month}
              className={
                m.month === selectedMonth ? "font-semibold text-foreground" : "text-muted"
              }
            >
              {formatMonthShort(m.month)}
            </span>
          ))}
        </div>
      </div>

      <table className="sr-only">
        <caption>Income and spending for the last {months.length} months</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Income</th>
            <th scope="col">Spending</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={m.month}>
              <th scope="row">{formatMonth(m.month)}</th>
              <td>{money(m.incomeMinor)}</td>
              <td>{money(m.spendingMinor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
