"use client";

import { useInView, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useRef } from "react";
import { cardClass } from "@/components/formStyles";
import { formatMoney } from "@/lib/money";
import { barTransition } from "@/lib/motion";
import { percentOfIncomeSpent, type CurrencyTotals } from "@/lib/summary";

// A half circle: radius 80 around (100, 100), drawn left to right.
const ARC = "M20 100 A80 80 0 0 1 180 100";

/**
 * How much of the month's income went out again, as a half-circle gauge
 * with the percentage in the middle. The gauge is a picture of the words
 * under it, so screen readers get the words. Past 100% it's full and red.
 */
export function SpentGauge({ totals, className }: { totals: CurrencyTotals; className: string }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotion() ?? false;
  const percent = percentOfIncomeSpent(totals);
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency: totals.currency });
  const over = percent !== null && percent > 100;

  return (
    <section ref={ref} aria-labelledby="gauge-heading" className={`${cardClass} flex flex-col p-5 ${className}`}>
      <h2 id="gauge-heading" className="font-semibold">
        Of income spent
      </h2>
      {percent === null ? (
        <p className="mt-2 text-sm text-muted">Once this month&apos;s income is in, you&apos;ll see here how much of it has gone.</p>
      ) : (
        <>
          <div className="relative mx-auto mt-4 w-full max-w-56">
            <svg aria-hidden="true" viewBox="0 0 200 112" className="block w-full">
              <path d={ARC} className="fill-none stroke-accent-soft" strokeWidth={18} strokeLinecap="round" />
              <m.path
                d={ARC}
                className={`fill-none ${over ? "stroke-danger" : "stroke-accent"}`}
                strokeWidth={18}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: inView ? Math.min(percent, 100) / 100 : 0 }}
                transition={barTransition(reduced)}
              />
            </svg>
            <p className="absolute inset-x-0 bottom-0 text-center">
              <span className={`text-3xl font-semibold tracking-tight tabular-nums ${over ? "text-danger" : ""}`}>{percent}%</span>
            </p>
          </div>
          <p className="mt-3 text-center text-sm text-muted">
            <span className="font-medium text-foreground tabular-nums">{money(totals.spendingMinor)}</span> of{" "}
            <span className="tabular-nums">{money(totals.incomeMinor)}</span>
            {over && " — more than came in"}
          </p>
        </>
      )}
    </section>
  );
}
