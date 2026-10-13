"use client";

import { Check } from "lucide-react";
import { AnimatePresence, useIsPresent } from "motion/react";
import * as m from "motion/react-m";
import type { Ref } from "react";
import { fadeRise } from "@/lib/motion";

export type Notice = {
  /** A new id for every notice, so the same text twice still shows again. */
  id: number;
  text: string;
};

/**
 * A short confirmation, like "Transaction added", that fades in near the
 * bottom of the screen and away again. The message is in words, so it
 * doesn't depend on the animation, and the status region around it stays on
 * the page, which is what makes screen readers reliably announce what's
 * put inside it.
 */
export function Toast({ notice }: { notice: Notice | null }) {
  return (
    <div
      role="status"
      // Above the floating Add button on phones; near the bottom elsewhere.
      className="pointer-events-none fixed inset-x-4 bottom-24 z-20 flex justify-center sm:bottom-6"
    >
      {/* popLayout: a message on its way out steps aside for the new one
          instead of the two sitting side by side. */}
      <AnimatePresence mode="popLayout">
        {notice && <Message key={notice.id} text={notice.text} />}
      </AnimatePresence>
    </div>
  );
}

type MessageProps = {
  text: string;
  /** From AnimatePresence, so popLayout can lift a leaving message out of
      the way (see AnimatedNumber). */
  ref?: Ref<HTMLParagraphElement>;
};

function Message({ text, ref }: MessageProps) {
  // A message on its way out is hidden from screen readers, so the status
  // region only ever holds the current one and nothing is read twice.
  const isPresent = useIsPresent();
  return (
    <m.p
      ref={ref}
      variants={fadeRise}
      initial="hidden"
      animate="shown"
      exit="hidden"
      aria-hidden={isPresent ? undefined : true}
      className="flex items-center gap-2 rounded-control bg-foreground px-4 py-3 text-sm font-medium text-canvas shadow-lg"
    >
      <Check aria-hidden="true" size={16} strokeWidth={2.5} />
      {text}
    </m.p>
  );
}
