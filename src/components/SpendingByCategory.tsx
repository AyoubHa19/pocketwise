"use client";

import { AnimatePresence, useInView, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useRef } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { useShowMore } from "@/components/ShowMore";
import { cardClass } from "@/components/formStyles";
import { formatMoney } from "@/lib/money";
import { barTransition, collapse } from "@/lib/motion";
import type { CategorySpending } from "@/lib/summary";

type Props = {
  /** From spendingByCategory: biggest first. */
  categories: CategorySpending[];
  currency: string;
  monthName: string;
};

/**
 * Where the month's money went. It's a plain list, so screen readers read
 * each line ("Rent, AED 500.00, 63%") with no separate text version. Each
 * bar is the category's share of all spending, matching the number beside
 * it, in one colour: the name, icon and figures already tell them apart.
 *
 * The bars grow to their share the first time the chart is on screen and
 * move to new shares when the data changes; the figures beside them are
 * always the real values straight away.
 */
export function SpendingByCategory({ categories, currency, monthName }: Props) {
  const ref = useRef<HTMLElement>(null);
  // Not while the chart is scrolled out of view, where nobody would see it.
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduced = useReducedMotion() ?? false;
  const rowVariants = collapse(reduced);
  // The biggest five; the rest behind a button.
  const { count, button: showMore } = useShowMore(categories.length, { initial: 5, noun: "categories" });

  return (
    <section
      ref={ref}
      aria-labelledby="by-category-heading"
      className={`${cardClass} p-5 sm:p-6`}
    >
      <h2 id="by-category-heading" className="font-semibold">
        Spending by category
      </h2>

      {categories.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No spending in {monthName}.</p>
      ) : (
        // Each row has its own space above (pt-4) instead of the list putting
        // gaps between rows, so a row can shrink away without a gap snapping
        // shut after it.
        <ul>
          <AnimatePresence initial={false}>
            {categories.slice(0, count).map(({ category, amountMinor, percent }) => (
              <m.li
                key={category}
                variants={rowVariants}
                initial="collapsed"
                animate="open"
                exit="collapsed"
                className="overflow-hidden"
              >
                <div className="flex items-center gap-3 pt-4">
                  <CategoryIcon category={category} small />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate font-medium">{category}</span>
                      <span className="shrink-0 font-medium tabular-nums">
                        {formatMoney({ amountMinor, currency })}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <div
                        aria-hidden="true"
                        className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted"
                      >
                        {/* Full width, scaled from the left to the share (at
                            least 1%, so a tiny category still shows a
                            sliver). A transform, so it moves smoothly. */}
                        <m.div
                          initial={{ scaleX: 0 }}
                          animate={{
                            scaleX: inView ? Math.max(percent, 1) / 100 : 0,
                          }}
                          transition={barTransition(reduced)}
                          style={{ originX: 0 }}
                          className="h-full w-full rounded-full bg-accent"
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-sm text-muted tabular-nums">
                        {percent}%
                      </span>
                    </div>
                  </div>
                </div>
              </m.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      {showMore}
    </section>
  );
}
