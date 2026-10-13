"use client";

import { AnimatePresence, useIsPresent } from "motion/react";
import * as m from "motion/react-m";
import { useState } from "react";
import { numberSwap } from "@/lib/motion";

type Props = {
  /** The number as it should be shown, already formatted ("AED 4,300.00"). */
  text: string;
  /** Its value, only to tell whether it went up or down. */
  value: number;
};

/**
 * Shows a formatted number. When it changes, the old one slides out and the
 * new one in (up if it grew, down if it shrank). It never counts through
 * numbers in between, so every figure on screen is a real one, and the
 * first value simply appears.
 */
export function AnimatedNumber({ text, value }: Props) {
  // React's way to react to a changed prop during render: remember the last
  // one, and when it differs, note which way the value moved.
  const [last, setLast] = useState({ text, value, direction: 0 });
  if (last.text !== text) {
    setLast({ text, value, direction: Math.sign(value - last.value) });
  }

  return (
    // popLayout lets the old number leave while the new one takes its place,
    // instead of waiting for it.
    <span className="relative inline-block">
      <AnimatePresence initial={false} mode="popLayout" custom={last.direction}>
        <Face key={text} text={text} direction={last.direction} />
      </AnimatePresence>
    </span>
  );
}

function Face({ text, direction }: { text: string; direction: number }) {
  // The number on its way out is hidden from screen readers, so they only
  // ever hear the current one.
  const isPresent = useIsPresent();
  return (
    <m.span
      custom={direction}
      variants={numberSwap}
      initial="enter"
      animate="center"
      exit="exit"
      aria-hidden={isPresent ? undefined : true}
      className="inline-block"
    >
      {text}
    </m.span>
  );
}
