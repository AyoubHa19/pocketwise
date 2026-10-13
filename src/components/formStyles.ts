// Shared Tailwind classes, so every form in the app looks the same.
// Everything you can tap is at least 44px tall (min-h-11), the size Apple
// and Google recommend for fingers.

// text-base (16px) stops phones from zooming in when a field is tapped.
export const fieldClass =
  "mt-1 block min-h-11 w-full rounded-md border border-zinc-300 bg-background px-3 py-2 text-base dark:border-zinc-700";

export const primaryButtonClass =
  "w-full rounded-md bg-foreground px-4 py-2.5 font-medium text-background hover:opacity-90 sm:w-auto";

export const secondaryButtonClass =
  "w-full rounded-md border border-zinc-300 px-4 py-2.5 font-medium hover:bg-zinc-100 sm:w-auto dark:border-zinc-700 dark:hover:bg-zinc-900";
