import { CategoryIcon } from "@/components/CategoryIcon";
import { pressable } from "@/components/formStyles";
import { formatMoney } from "@/lib/money";
import { formatDay, type DateOrder } from "@/lib/preferences";
import { draftFor, type Occurrence } from "@/lib/recurring";
import type { Transaction } from "@/lib/transactions";

const smallButtonClass = `inline-flex min-h-11 shrink-0 items-center rounded-control px-3 text-sm font-medium ${pressable}`;

/** How far off a date is, in words: "Overdue", "Today", "In 3 days". */
function whenText(occurrence: Occurrence, today: string): string {
  if (occurrence.state === "overdue") return "Overdue";
  if (occurrence.state === "today") return "Due today";
  const days = Math.round(
    (Date.UTC(...ymd(occurrence.date)) - Date.UTC(...ymd(today))) / 86_400_000,
  );
  return days === 1 ? "Tomorrow" : `In ${days} days`;
}

function ymd(date: string): [number, number, number] {
  const [y, m, d] = date.split("-").map(Number);
  return [y, m - 1, d];
}

/**
 * One recurring item that's due: what, when (in words, overdue in red),
 * how much, and buttons to record it (which opens the filled-in form) or
 * skip it. Used on the Bills page and the dashboard.
 */
export function OccurrenceRow({
  occurrence,
  today,
  dateOrder,
  categoryName,
  onRecord,
  onSkip,
}: {
  occurrence: Occurrence;
  today: string;
  dateOrder: DateOrder;
  categoryName: string;
  onRecord: (draft: Transaction) => void;
  onSkip?: () => void;
}) {
  const { rule, date, state } = occurrence;
  const money = formatMoney(rule.amount);
  const isIncome = rule.type === "income";
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
      <CategoryIcon category={categoryName} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{rule.name}</p>
        <p className="text-sm text-muted">
          <span className={state === "overdue" ? "font-medium text-danger" : ""}>{whenText(occurrence, today)}</span>
          {/* "Due today" already says the day. */}
          {state !== "today" && ` · ${formatDay(date, today, dateOrder)}`}
        </p>
      </div>
      <p className={`shrink-0 font-medium tabular-nums ${isIncome ? "text-positive" : ""}`}>
        {isIncome ? money : `-${money}`}
      </p>
      <div className="flex w-full justify-end gap-2 sm:w-auto">
        {onSkip && (
          <button
            type="button"
            aria-label={`Skip ${rule.name} on ${formatDay(date, today, dateOrder)}`}
            onClick={onSkip}
            className={`${smallButtonClass} text-muted hover:bg-surface-muted hover:text-foreground`}
          >
            Skip
          </button>
        )}
        <button
          type="button"
          aria-label={`${isIncome ? "Mark received" : "Mark paid"}: ${rule.name} on ${formatDay(date, today, dateOrder)}`}
          onClick={() => onRecord(draftFor(rule, date, categoryName))}
          className={`${smallButtonClass} bg-accent text-accent-foreground hover:opacity-90`}
        >
          {isIncome ? "Mark received" : "Mark paid"}
        </button>
      </div>
    </li>
  );
}
