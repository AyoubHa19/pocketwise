import {
  cardClass,
  dashboardGridClass,
  dashboardListArea,
  dashboardSummaryArea,
  summaryBalanceArea,
  summaryGridClass,
  summaryMonthArea,
  summaryPickerArea,
} from "@/components/formStyles";

// Grey shapes where the content will be. They only pulse for people who
// haven't asked their device to reduce motion.
const bone = "rounded-control bg-surface-muted motion-safe:animate-pulse";

/**
 * Shown for the moment before the browser has read the saved data, in the
 * same layout as the dashboard, so nothing jumps when the real content
 * arrives. Each row below is as tall as the line of text it stands in for
 * in MonthSummary and TransactionList; keep them in step when those change.
 */
export function DashboardSkeleton() {
  return (
    <div className={dashboardGridClass}>
      <p role="status" className="sr-only">
        Loading your transactions…
      </p>

      <div
        aria-hidden="true"
        className={`${summaryGridClass} ${dashboardSummaryArea}`}
      >
        {/* The Account balance card: same fixed height as the real one. */}
        <div
          className={`${cardClass} h-[9.125rem] px-5 pt-2 pb-5 sm:px-6 ${summaryBalanceArea}`}
        >
          <div className="flex h-11 items-center">
            <div className={`${bone} h-3.5 w-28`} />
          </div>
          <div className={`${bone} mt-1 h-8 w-40`} />
          <div className={`${bone} mt-2 h-3.5 w-48`} />
        </div>
        <div className={`${bone} h-11 w-64 ${summaryPickerArea}`} />
        <div className={`${cardClass} @container p-5 sm:p-6 ${summaryMonthArea}`}>
          {/* "Left this month" label, then the amount at each screen size's height */}
          <div className="flex h-5 items-center">
            <div className={`${bone} h-3.5 w-16`} />
          </div>
          <div className={`${bone} mt-1 h-9 w-48 sm:h-12`} />
          {/* Income and spending: a label line and an amount line */}
          <div className="mt-5 grid gap-4 border-t border-line pt-4 @2xs:grid-cols-2">
            <div className={`${bone} h-[3.125rem]`} />
            <div className={`${bone} h-[3.125rem]`} />
          </div>
          {/* The bar, and the "% of income spent" line under it */}
          <div className={`${bone} mt-4 h-2`} />
          <div className="mt-2 flex h-5 items-center">
            <div className={`${bone} h-3.5 w-36`} />
          </div>
        </div>
      </div>

      <div aria-hidden="true" className={dashboardListArea}>
        {/* As tall as the real heading row, whose Add button is 44px. */}
        <div className="flex min-h-11 items-center">
          <div className={`${bone} h-7 w-56`} />
        </div>
        {/* The first day: its heading line ("Today", the day's total)... */}
        <div className="mt-4 mb-2 flex h-5 items-center justify-between px-1">
          <div className={`${bone} h-3.5 w-14`} />
          <div className={`${bone} h-3.5 w-12`} />
        </div>
        {/* ...then rows of an icon circle, a name, and an amount. */}
        <div className={`${cardClass} divide-y divide-line`}>
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex h-16 items-center gap-3 px-4">
              <div className="h-10 w-10 shrink-0 rounded-full bg-surface-muted motion-safe:animate-pulse" />
              <div className={`${bone} h-4 w-24 flex-none`} />
              <div className={`${bone} ml-auto h-4 w-16`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
