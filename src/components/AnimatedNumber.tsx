"use client";

import { AnimatePresence, useIsPresent } from "motion/react";
import * as m from "motion/react-m";
import { useState, type Ref } from "react";
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

type FaceProps = {
  text: string;
  direction: number;
  /** From AnimatePresence. popLayout measures the leaving number through
      it to lift it out of the line; without it, the old and new numbers
      would sit side by side while the old one fades. */
  ref?: Ref<HTMLSpanElement>;
};

function Face({ text, direction, ref }: FaceProps) {
  // The number on its way out is hidden from screen readers, so they only
  // ever hear the current one.
  const isPresent = useIsPresent();
  return (
    <m.span
      ref={ref}
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
