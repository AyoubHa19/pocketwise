// Shared Tailwind classes, so every card, field and button in the app looks
// the same. The colour names (surface, muted, accent...) are the design
// tokens defined in globals.css, and switch for dark mode on their own.
// Everything you can tap is at least 44px tall (min-h-11), the size Apple
// and Google recommend for fingers.

export const cardClass =
  "rounded-card border border-line bg-surface shadow-card";

// text-base (16px) stops phones from zooming in when a field is tapped.
export const fieldClass =
  "mt-1 block min-h-11 w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-base text-foreground";

export const primaryButtonClass =
  "inline-flex min-h-11 w-full items-center justify-center rounded-control bg-accent px-5 font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50 sm:w-auto";

export const secondaryButtonClass =
  "inline-flex min-h-11 w-full items-center justify-center rounded-control border border-line-strong bg-surface px-5 font-medium text-foreground hover:bg-surface-muted sm:w-auto";

/** Small buttons inside a list row, like Edit and Delete. */
export const textButtonClass =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-3 text-sm font-medium text-muted hover:bg-surface-muted";
