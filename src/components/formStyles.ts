// Shared Tailwind classes, so every card, field and button in the app looks
// the same. The colour names (surface, muted, accent...) are the design
// tokens defined in globals.css, and switch for dark mode on their own.
// Everything you can tap is at least 44px tall (min-h-11), the size Apple
// and Google recommend for fingers.

export const cardClass =
  "rounded-card border border-line bg-surface shadow-card";

/**
 * The home page layout, shared with its loading skeleton. On phones it's one
 * column in reading order: summary, transactions, charts. From lg (1024px)
 * it's two rows, in that same order: the summary across the full width,
 * then the transactions (the wider side) next to the charts.
 *
 * The summary spans the width so no column becomes a tall tower of cards
 * next to a short one, which left big empty areas when a month had only a
 * few transactions.
 */
// On phones the single column is minmax(0, 1fr), not the default auto: an
// auto column grows to fit its widest unbreakable line (a long note, say),
// which pushed the page wider than the screen. This way it takes the screen's
// width and long text is cut short with "…" as intended.
export const dashboardGridClass =
  "grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-x-10";

export const dashboardSummaryArea = "lg:col-span-2";
export const dashboardListArea = "lg:col-start-1 lg:row-start-2";
export const dashboardChartsArea = "lg:col-start-2 lg:row-start-2";

/**
 * Inside the summary, from lg: the account balance with the month picker
 * under it on the left, and the month's summary on the right, which is
 * about as tall as the two together. On phones it's a simple stack.
 *
 * The second row is 1fr so, if the month summary is the taller side, the
 * extra height goes under the month picker rather than between the cards.
 */
export const summaryGridClass =
  "space-y-4 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-10 lg:gap-y-4 lg:space-y-0";

export const summaryBalanceArea = "lg:col-start-1 lg:row-start-1";
export const summaryPickerArea = "lg:col-start-1 lg:row-start-2";
export const summaryMonthArea = "lg:col-start-2 lg:row-span-2 lg:row-start-1";

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
