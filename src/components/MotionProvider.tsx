"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import type { ReactNode } from "react";
import { baseTransition } from "@/lib/motion";

/**
 * Sets up Motion once for the whole app.
 *
 * - LazyMotion with domAnimation loads only animation and gestures (no
 *   drag or layout animation), and `strict` stops anyone using the heavier
 *   `motion.div` instead of `m.div` by mistake.
 * - reducedMotion="user" follows the device's "reduce motion" setting:
 *   movement is dropped and only fades remain.
 *
 * Wrapping the page in this client component doesn't turn the server
 * components inside it into client ones: they arrive as `children`.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={baseTransition}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
