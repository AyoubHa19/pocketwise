"use client";

import { useEffect, useRef } from "react";

/**
 * A soft light that follows the mouse behind the glass (.cursor-light in
 * globals.css), so everything glows where it passes, and a brighter spot
 * on the glass card under the pointer (--spot-x/--spot-y and data-lit,
 * used by the glass utilities). It glides after the pointer rather than
 * sticking to it. Only for a mouse or trackpad (a finger has nothing to
 * follow between taps), and not for people who reduce motion. Decorative, so hidden from screen readers.
 */
export function CursorLight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const light = ref.current;
    if (!light) return;
    const fine = window.matchMedia("(pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduce.matches) return;

    let lit: HTMLElement | null = null;
    let target = { x: 0, y: 0 };
    let shown = { x: 0, y: 0 };
    let frame = 0;

    // Each frame, a fifth of the way to the pointer: it eases to a stop.
    function glide() {
      shown = { x: shown.x + (target.x - shown.x) * 0.2, y: shown.y + (target.y - shown.y) * 0.2 };
      light!.style.transform = `translate3d(${shown.x}px, ${shown.y}px, 0)`;
      frame = Math.hypot(target.x - shown.x, target.y - shown.y) > 0.5 ? requestAnimationFrame(glide) : 0;
    }
    function move(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      target = { x: event.clientX, y: event.clientY };
      // The spot on the glass under the pointer, where the pointer is in it.
      const glass = (event.target as Element | null)?.closest<HTMLElement>(".glass, .glass-strong") ?? null;
      if (glass !== lit) {
        lit?.removeAttribute("data-lit");
        glass?.setAttribute("data-lit", "");
        lit = glass;
      }
      if (glass) {
        const box = glass.getBoundingClientRect();
        glass.style.setProperty("--spot-x", `${event.clientX - box.left}px`);
        glass.style.setProperty("--spot-y", `${event.clientY - box.top}px`);
      }
      if (!light!.hasAttribute("data-on")) {
        shown = target; // The first time, appear right there.
        light!.setAttribute("data-on", "");
      }
      if (!frame) frame = requestAnimationFrame(glide);
    }
    function leave() {
      light!.removeAttribute("data-on");
      lit?.removeAttribute("data-lit");
      lit = null;
    }

    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={ref} aria-hidden="true" className="cursor-light" />;
}
