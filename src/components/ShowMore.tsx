"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState, type ReactNode } from "react";
import { pressable } from "@/components/formStyles";

type Options = {
  /** How many to show at first. */
  initial: number;
  /** How many more each press shows; leave out to show all at once. */
  step?: number;
  /** What's counted, in the plural, for the button: "transactions". */
  noun: string;
};

/**
 * Keeps a long list short: the first `initial` items, then a button to
 * show more (all of them, or `step` more at a time) and, once opened, to
 * show fewer again. Returns how many to show and the button (null when the
 * list is short enough to show whole). The button says how many there are,
 * so nobody wonders what's hidden; its state is announced as expanded or
 * not.
 */
export function useShowMore(total: number, { initial, step, noun }: Options): { count: number; button: ReactNode } {
  const [count, setCount] = useState(initial);
  const shown = Math.min(count, total);
  if (total <= initial) return { count: total, button: null };

  const left = total - shown;
  const more = step === undefined ? left : Math.min(step, left);
  const label =
    left === 0 ? "Show fewer" : step === undefined || more === left ? `Show all ${total} ${noun}` : `Show ${more} more (${left} left)`;

  return {
    count: shown,
    button: (
      <button
        type="button"
        aria-expanded={left === 0}
        onClick={() => setCount(left === 0 ? initial : shown + more)}
        className={`mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-control text-sm font-medium text-foreground hover:bg-surface-muted ${pressable}`}
      >
        {label}
        {left === 0 ? <ChevronUp aria-hidden="true" size={16} /> : <ChevronDown aria-hidden="true" size={16} />}
      </button>
    ),
  };
}

/**
 * useShowMore as a wrapper, for lists drawn inside a loop (where a hook
 * can't go): `children` draws the items to show, and the button follows.
 */
export function ShortList<T>({
  items,
  children,
  ...options
}: Options & { items: T[]; children: (visible: T[]) => ReactNode }) {
  const { count, button } = useShowMore(items.length, options);
  return (
    <>
      {children(items.slice(0, count))}
      {button}
    </>
  );
}
