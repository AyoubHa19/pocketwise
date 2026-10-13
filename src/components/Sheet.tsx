"use client";

import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { pressable } from "@/components/formStyles";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  /**
   * Where to put keyboard focus on closing if the button that opened the
   * sheet is gone by then, say because its transaction was just deleted.
   */
  fallbackFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
};

/**
 * A panel that opens over the page: it slides up from the bottom on phones
 * and sits on the right on larger screens.
 *
 * It's built on the browser's <dialog>, which, once opened with showModal(),
 * blocks the page behind it, closes on Esc, and puts keyboard focus back on
 * the button that opened it.
 *
 * Put data-autofocus on the field that should be focused when it opens.
 */
export function Sheet({
  open,
  title,
  onClose,
  fallbackFocusRef,
  children,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<Element | null>(null);
  const titleId = useId();

  // React decides whether the sheet is open; this tells the browser's
  // <dialog> to match. (Talking to something outside React, like this, is
  // what effects are for.)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      openerRef.current = document.activeElement;
      dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
      // close() puts focus back on the opener, but if the opener has left
      // the page, focus would fall to nothing and keyboard and screen
      // reader users would lose their place.
      if (!openerRef.current?.isConnected) fallbackFocusRef?.current?.focus();
    }
  }, [open, fallbackFocusRef]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // Esc: let React close it, so React's state stays the one in charge.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // A click on the dialog itself, not on its content, is a click on the
      // dimmed backdrop around it.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      // "sheet" gives it the slide in and out, and the backdrop's fade:
      // see globals.css.
      className="sheet fixed inset-x-0 top-auto bottom-0 m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-card border-0 bg-surface p-0 text-foreground shadow-xl sm:inset-y-0 sm:right-0 sm:left-auto sm:h-dvh sm:max-h-none sm:max-w-md sm:rounded-none sm:rounded-l-card"
    >
      {/* Always rendered, so the content is still there while the sheet
          slides away. A closed <dialog> is hidden from everyone anyway. */}
      <div className="p-4 pb-6 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-control text-2xl leading-none text-muted hover:bg-surface-muted hover:text-foreground ${pressable}`}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
