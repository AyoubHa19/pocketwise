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
