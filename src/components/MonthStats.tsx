"use client";

import { ArrowDownLeft, ArrowUpRight, Scale, type LucideIcon } from "lucide-react";
import { useId, type ReactNode } from "react";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { fitOneLine } from "@/components/fitOneLine";
import { cardClass } from "@/components/formStyles";
import { smoothPath } from "@/lib/chart";
import { formatMonth, formatMonthShort } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { changePercent, percentOfIncomeSpent, type CurrencyTotals, type MonthTotals } from "@/lib/summary";

type Props = {
  /** The month's totals in the main currency. */
  totals: CurrencyTotals;
  /** From monthlyTotals: the last 6 months, ending with the month shown. */
  months: MonthTotals[];
};

/**
 * The month in three tiles across the top of the dashboard: what went
 * out, what came in, and what's left. Each has its change from the month
 * before, said in words as well as colour, and a small picture of the last
 * six months (hidden from screen readers: the Cash flow card has the same
 * numbers as a table).
 */
export function MonthStats({ totals, months }: Props) {
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency: totals.currency });
  const previous = months.at(-2);
  const spent = percentOfIncomeSpent(totals);

  return (
    <>
      <Tile
        label="Spending"
        icon={ArrowUpRight}
        amount={money(totals.spendingMinor)}
        value={totals.spendingMinor}
        footer={
          <>
            <Change now={totals.spendingMinor} before={previous?.spendingMinor} month={previous?.month} upIsGood={false} />
            <MiniBars values={months.map((m) => m.spendingMinor)} />
          </>
        }
      />
      <Tile
        label="Income"
        icon={ArrowDownLeft}
        amount={money(totals.incomeMinor)}
        value={totals.incomeMinor}
        tone="positive"
        footer={
          <>
            <Change now={totals.incomeMinor} before={previous?.incomeMinor} month={previous?.month} upIsGood />
            <Sparkline values={months.map((m) => m.incomeMinor)} />
          </>
        }
      />
      <Tile
        label="Left over"
        icon={Scale}
        amount={money(totals.balanceMinor)}
        value={totals.balanceMinor}
        tone={totals.balanceMinor < 0 ? "danger" : undefined}
        footer={
          <p className="text-xs text-muted">
            {/* With no income yet, "left" is just minus the spending, which
                alarms people who haven't entered their pay. Say why. */}
            {spent === null ? "Add the month's income to see what's left." : `${spent}% of income spent`}
          </p>
        }
      />
    </>
  );
}

function Tile({
  label,
  icon: Icon,
  amount,
  value,
  tone,
  footer,
}: {
  label: string;
  icon: LucideIcon;
  amount: string;
  value: number;
  tone?: "positive" | "danger";
  footer: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={`${cardClass} @container flex min-h-40 flex-col p-5`}>
      <div className="flex items-start justify-between gap-3">
        <h2 id={id} className="pt-1.5 text-sm font-medium text-muted">
          {label}
        </h2>
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Icon size={18} />
        </span>
      </div>
      <p
        className={`mt-1 leading-9 font-semibold tracking-tight tabular-nums [overflow-wrap:anywhere] ${
          tone === "danger" ? "text-danger" : tone === "positive" ? "text-positive" : ""
        }`}
        style={fitOneLine(amount, "1.125rem", "1.75rem")}
      >
        <AnimatedNumber text={amount} value={value} />
      </p>
      <div className="mt-auto flex items-end justify-between gap-3 pt-3">{footer}</div>
    </section>
  );
}

/**
 * The change from last month as a badge: "+12%" or "−8%", green when it's
 * good news (less spending, more income) and red when it isn't, then
 * "vs Sep". A change many times over reads better as "40×".
 */
function Change({ now, before, month, upIsGood }: { now: number; before?: number; month?: string; upIsGood: boolean }) {
  if (before === undefined || month === undefined) return null;
  const percent = changePercent(now, before);
  if (percent === null) {
    return <p className="text-xs text-muted">Nothing in {formatMonthShort(month)} to compare</p>;
  }
  const good = percent === 0 || percent > 0 === upIsGood;
  const text =
    percent >= 1000 ? `${Math.round(now / before)}×` : `${percent > 0 ? "+" : percent < 0 ? "−" : ""}${Math.abs(percent)}%`;
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted">
      <span
        className={`rounded-full px-2 py-0.5 font-semibold tabular-nums ${
          good ? "bg-positive-surface text-positive" : "bg-danger-surface text-danger"
        }`}
      >
        {text}
      </span>
      <span>
        vs <abbr title={formatMonth(month)} className="no-underline">{formatMonthShort(month)}</abbr>
      </span>
    </p>
  );
}

/** Six little bars, the last (the month shown) in black. Decorative. */
function MiniBars({ values }: { values: number[] }) {
  const largest = Math.max(1, ...values);
  return (
    <div aria-hidden="true" className="flex h-10 shrink-0 items-end gap-1">
      {values.map((value, index) => (
        <span
          key={index}
          className={`w-1.5 rounded-full ${index === values.length - 1 ? "bg-ink" : "bg-accent/35"}`}
          style={{ height: `${Math.max(12, (value / largest) * 100)}%` }}
        />
      ))}
    </div>
  );
}

/** A small smooth line of the last six months. Decorative. */
function Sparkline({ values }: { values: number[] }) {
  const width = 72;
  const height = 36;
  const largest = Math.max(1, ...values);
  const points = values.map((value, index) => ({
    x: (index / Math.max(1, values.length - 1)) * width,
    y: height - 3 - (value / largest) * (height - 6),
  }));
  return (
    <svg aria-hidden="true" width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0 overflow-visible">
      <path d={smoothPath(points)} className="fill-none stroke-accent" strokeWidth={2.25} strokeLinecap="round" />
      <circle cx={points.at(-1)!.x} cy={points.at(-1)!.y} r={3.5} className="fill-ink" />
    </svg>
  );
}
