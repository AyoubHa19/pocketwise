// Shared Tailwind classes, so every card, field and button in the app looks
// the same. The colour names (surface, muted, accent...) are the design
// tokens defined in globals.css, and switch for dark mode on their own.
// Everything you can tap is at least 44px tall (min-h-11), the size Apple
// and Google recommend for fingers.

export const cardClass = "glass rounded-card";

/**
 * The home page layout, shared with its loading skeleton: three rows of
 * cards, in reading order at every size.
 * - The month in four tiles: spending, income, left over, safe to spend.
 *   One a row on the smallest phones, two from 420px, four from lg.
 * - The overview: the cash flow chart, the gauge and the total balance.
 *   From md (768px) the chart is on top and the other two side by side;
 *   from lg (1024px) all three in a row, 6 + 3 + 3 of twelve columns.
 * - The activity: the transactions, and from lg beside them (7 + 5) the
 *   bills, budgets and categories.
 *
 * Columns are minmax(0, 1fr), not the default auto: an auto column grows
 * to fit its widest unbreakable line (a long note, say), which pushed the
 * page wider than the screen.
 */
export const dashboardRowsClass = "space-y-4 lg:space-y-5";

export const statsRowClass =
  "grid grid-cols-[minmax(0,1fr)] gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4 lg:gap-5";

export const overviewRowClass = "grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 lg:grid-cols-12 lg:gap-5";
export const chartArea = "md:col-span-2 lg:col-span-6";
export const gaugeArea = "lg:col-span-3";
export const balanceArea = "lg:col-span-3";

export const activityRowClass = "grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-12 lg:items-start lg:gap-5";
export const listArea = "lg:col-span-7";
export const sideArea = "lg:col-span-5";

// Simple interaction feedback is CSS, not Motion: it needs no JavaScript.
// Timing matches src/lib/motion.ts (fast = 150ms, ease-pocket).

/**
 * Colours ease over 150ms on hover and focus instead of snapping. Nothing
 * moves, so it stays on for people who reduce motion.
 */
export const colorTransition =
  "transition-[color,background-color,border-color,opacity] duration-150 ease-pocket";

/**
 * For buttons: colour transitions plus a slight press-in (98%) while held,
 * like a physical button. The press is dropped for people who reduce motion.
 */
export const pressable =
  "transition-[color,background-color,border-color,opacity,scale] duration-150 ease-pocket active:scale-[0.98] motion-reduce:active:scale-100";

// A field marked aria-invalid (its value was rejected) gets a red border,
// even on hover, as well as the written error message.
const invalid = "aria-invalid:border-danger aria-invalid:hover:border-danger";

// text-base (16px) stops phones from zooming in when a field is tapped.
export const fieldClass = `mt-1 block min-h-11 w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-base text-foreground hover:border-muted ${invalid} ${colorTransition}`;

/** The big amount field at the top of the transaction form. */
export const amountFieldClass = `mt-1 block min-h-14 w-full rounded-control border border-line-strong bg-surface px-4 py-2 text-2xl font-semibold tabular-nums text-foreground hover:border-muted ${invalid} ${colorTransition}`;

export const primaryButtonClass = `inline-flex min-h-11 w-full items-center justify-center rounded-control bg-accent px-5 font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50 sm:w-auto ${pressable}`;

export const secondaryButtonClass = `inline-flex min-h-11 w-full items-center justify-center rounded-control border border-line-strong bg-surface px-5 font-medium text-foreground hover:bg-surface-muted sm:w-auto ${pressable}`;

/** For actions that destroy something, like Delete. Pushed to the far end
    on larger screens, away from Save. */
export const dangerButtonClass = `inline-flex min-h-11 w-full items-center justify-center rounded-control px-5 font-medium text-danger hover:bg-danger-surface sm:ml-auto sm:w-auto ${pressable}`;
