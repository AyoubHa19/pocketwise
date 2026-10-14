import type { BudgetProgress, BudgetState } from "@/lib/budgets";
import { formatMoney } from "@/lib/money";

export const STATE_LABELS: Record<BudgetState, string> = {
  ok: "On track",
  near: "Close to limit",
  over: "Over budget",
};

const fillClass: Record<BudgetState, string> = {
  ok: "bg-accent",
  near: "bg-warning",
  over: "bg-danger",
};

const stateTextClass: Record<BudgetState, string> = {
  ok: "text-muted",
  near: "text-warning",
  over: "text-danger",
};

/**
 * How much of a budget is used: a bar, and the same in words (the state
 * is written out, never shown by colour alone). Over budget, the bar is
 * full and the overspend is written in full, never hidden (PRD 10.8).
 */
export function BudgetMeter({
  label,
  progress,
  limitMinor,
  currency,
}: {
  label: string;
  progress: BudgetProgress;
  limitMinor: number;
  currency: string;
}) {
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency });
  const { spentMinor, remainingMinor, percent, state } = progress;
  const left =
    remainingMinor >= 0 ? `${money(remainingMinor)} left` : `${money(-remainingMinor)} over`;
  // Rounded down, a little spending would read as 0%, as if nothing had.
  const used = spentMinor > 0 && percent === 0 ? "under 1%" : `${percent}%`;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate font-medium">{label}</p>
        <p className={`shrink-0 text-sm font-medium ${stateTextClass[state]}`}>
          {STATE_LABELS[state]}
        </p>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(percent, 100)}
        aria-valuetext={`${used} used: ${money(spentMinor)} of ${money(limitMinor)}, ${left}. ${STATE_LABELS[state]}.`}
        className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"
      >
        <div
          className={`h-full rounded-full ${fillClass[state]}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-sm tabular-nums">
        <p className="text-muted">
          {money(spentMinor)} of {money(limitMinor)} · {used}
        </p>
        <p className={remainingMinor < 0 ? "font-medium text-danger" : "text-muted"}>{left}</p>
      </div>
    </div>
  );
}
