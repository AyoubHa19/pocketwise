import { DashboardHeader } from "@/components/DashboardHeader";
import {
  activityRowClass,
  balanceArea,
  cardClass,
  chartArea,
  dashboardRowsClass,
  gaugeArea,
  listArea,
  overviewRowClass,
  statsRowClass,
} from "@/components/formStyles";

// Grey shapes where the content will be. They only pulse for people who
// haven't asked their device to reduce motion.
const bone = "rounded-control bg-surface-muted motion-safe:animate-pulse";

/**
 * Shown for the moment before the browser has read the saved data, in the
 * same layout as the dashboard (the greeting is real already), so nothing
 * jumps when the content arrives. Each card is as tall as the real one's
 * smallest size; keep them in step when those change.
 */
export function DashboardSkeleton() {
  return (
    <>
      <DashboardHeader>
        <div aria-hidden="true" className={`${bone} h-[3.25rem] w-60 rounded-full`} />
      </DashboardHeader>
      <p role="status" className="sr-only">
        Loading your money…
      </p>

      <div aria-hidden="true" className={dashboardRowsClass}>
        <div className={statsRowClass}>
          {[0, 1, 2, 3].map((tile) => (
            <div key={tile} className={`${cardClass} flex min-h-40 flex-col p-5`}>
              <div className="flex items-start justify-between">
                <div className={`${bone} mt-1.5 h-3.5 w-20`} />
                <div className="h-9 w-9 rounded-full bg-surface-muted motion-safe:animate-pulse" />
              </div>
              <div className={`${bone} mt-2 h-7 w-32`} />
              <div className={`${bone} mt-auto h-4 w-24`} />
            </div>
          ))}
        </div>

        <div className={overviewRowClass}>
          <div className={`${cardClass} h-72 p-5 sm:p-6 ${chartArea}`}>
            <div className={`${bone} h-4 w-24`} />
            <div className={`${bone} mt-6 h-40`} />
          </div>
          <div className={`${cardClass} h-72 p-5 ${gaugeArea}`}>
            <div className={`${bone} h-4 w-28`} />
          </div>
          <div className={`${cardClass} h-72 p-5 ${balanceArea}`}>
            <div className={`${bone} h-4 w-24`} />
            <div className={`${bone} mt-4 h-7 w-36`} />
          </div>
        </div>

        <div className={activityRowClass}>
          <div className={`${cardClass} p-4 sm:p-6 ${listArea}`}>
            <div className="flex min-h-11 items-center">
              <div className={`${bone} h-6 w-56`} />
            </div>
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex h-16 items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-surface-muted motion-safe:animate-pulse" />
                <div className={`${bone} h-4 w-24 flex-none`} />
                <div className={`${bone} ml-auto h-4 w-16`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
