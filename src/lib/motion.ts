import type { Transition, Variants } from "motion/react";

// One set of motion settings for the whole app, so every animation has the
// same feel. CSS transitions use the same values: see --ease-pocket and the
// duration-* classes in globals.css and formStyles.ts.

/** In seconds. Fast for hover and press, base for appearing, slow for the sheet. */
export const duration = { fast: 0.15, base: 0.22, slow: 0.32 } as const;

/**
 * Starts quickly and settles gently, with no bounce or overshoot. The same
 * curve as --ease-pocket in globals.css.
 */
export const ease = [0.22, 1, 0.36, 1] as const;

/** The gap between items appearing one after another, in seconds. */
export const stagger = 0.05;

/** How far things rise as they appear, in pixels: enough to notice, no more. */
const rise = 8;

export const baseTransition: Transition = { duration: duration.base, ease };

/**
 * Fade in while rising slightly. Pass its place in the order as `custom`
 * (0, 1, 2...) and it waits that many `stagger` steps, so a group appears
 * one by one. With reduced motion, MotionProvider drops the movement and
 * keeps only the fade.
 */
export const fadeRise: Variants = {
  hidden: { opacity: 0, y: rise },
  shown: (order: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { ...baseTransition, delay: order * stagger },
  }),
};

// Stage 7: motion that follows the data. Each one moves only what changed.

/**
 * A number changing: the old value slides out and the new one in, up when
 * the value grew (`custom` 1) and down when it shrank (-1). Nothing is shown
 * in between, so every figure on screen is a real one.
 */
export const numberSwap: Variants = {
  enter: (direction: number) => ({ opacity: 0, y: direction < 0 ? -6 : 6 }),
  center: { opacity: 1, y: 0, transition: baseTransition },
  exit: (direction: number) => ({
    opacity: 0,
    y: direction < 0 ? 6 : -6,
    transition: { duration: duration.fast, ease },
  }),
};

/**
 * A new month's content arriving from the side you moved to: from the
 * right for a later month (`custom` 1), from the left for an earlier one.
 */
export const monthSlide: Variants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 16 }),
  center: { opacity: 1, x: 0, transition: baseTransition },
};

/**
 * A list row or day appearing or going away: it grows from or shrinks to
 * nothing, so the rows around it make room smoothly instead of jumping.
 * Height isn't a transform, so MotionProvider's reduced motion doesn't stop
 * it; pass `reduced` to make it instant then.
 */
export function collapse(reduced: boolean): Variants {
  const time = (seconds: number) => (reduced ? 0 : seconds);
  return {
    collapsed: {
      opacity: 0,
      height: 0,
      transition: {
        height: { duration: time(duration.base), ease },
        opacity: { duration: time(duration.fast), ease },
      },
    },
    open: {
      opacity: 1,
      height: "auto",
      transition: {
        height: { duration: time(duration.base), ease },
        opacity: { duration: time(duration.base), ease, delay: time(0.05) },
      },
    },
  };
}

/** Chart bars and progress bars moving to their value. */
export function barTransition(reduced: boolean): Transition {
  return reduced ? { duration: 0 } : { duration: duration.slow, ease };
}
