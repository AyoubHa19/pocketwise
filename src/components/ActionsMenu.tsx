"use client";

import { Ellipsis } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { colorTransition, pressable } from "@/components/formStyles";

export type Action = { label: string; onSelect: () => void; danger?: boolean };

// The menu's width (w-48), to line its right edge up with the button's.
const MENU_WIDTH = 192;

/**
 * A round "⋯" button that opens a small glass menu of a card's less used
 * actions (Edit, Archive, Delete…), so the card keeps one or two buttons
 * in view. It's the browser's popover: Esc or a click outside closes it,
 * and the menu comes right after the button, so Tab goes from one into
 * the other. `label` names the button for screen readers ("More actions
 * for Trip").
 */
export function ActionsMenu({ label, actions }: { label: string; actions: Action[] }) {
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // A popover sits in the middle of the screen by default; this puts it
  // under the button, lined up with its right edge, kept on screen.
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    function place(event: Event) {
      if ((event as ToggleEvent).newState !== "open" || !buttonRef.current || !menu) return;
      const box = buttonRef.current.getBoundingClientRect();
      menu.style.top = `${box.bottom + 6}px`;
      menu.style.left = `${Math.max(8, box.right - MENU_WIDTH)}px`;
    }
    menu.addEventListener("beforetoggle", place);
    return () => menu.removeEventListener("beforetoggle", place);
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        popoverTarget={menuId}
        aria-label={label}
        title="More actions"
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-muted hover:text-foreground ${pressable}`}
      >
        <Ellipsis aria-hidden="true" size={20} />
      </button>
      <div ref={menuRef} id={menuId} popover="auto" className="glass-strong fixed inset-auto m-0 w-48 rounded-card p-1.5 text-foreground">
        <ul>
          {actions.map((action) => (
            <li key={action.label}>
              <button
                type="button"
                onClick={() => {
                  menuRef.current?.hidePopover();
                  action.onSelect();
                }}
                className={`flex min-h-11 w-full items-center rounded-control px-3 text-left text-sm font-medium hover:bg-surface-muted ${colorTransition} ${
                  action.danger ? "text-danger" : ""
                }`}
              >
                {action.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
