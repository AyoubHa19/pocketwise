"use client";

import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { colorTransition } from "@/components/formStyles";

type Item = { href: string; label: string; icon: ReactNode };

/**
 * The header's "More" button and the menu it opens, for the pages that
 * don't fit as links of their own. It's built on the browser's popover,
 * which closes on Esc or a click outside, and the menu comes right after
 * the button, so Tab goes from one into the other. The button looks
 * selected while you're on one of its pages.
 */
export function MoreMenu({ items }: { items: Item[] }) {
  const pathname = usePathname();
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isCurrent = items.some((item) => item.href === pathname);

  // A popover sits in the middle of the screen by default; this puts it
  // under the button, lined up with its right edge, each time it opens.
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    function place(event: Event) {
      if ((event as ToggleEvent).newState !== "open" || !buttonRef.current || !menu) return;
      const rect = buttonRef.current.getBoundingClientRect();
      menu.style.top = `${rect.bottom + 8}px`;
      // Its right edge at the button's (it's shifted back by its own width,
      // -translate-x-full), measured from the left like the button, so a
      // scrollbar can't throw it off; never past the screen's left edge.
      menu.style.left = `${Math.max(rect.right, menu.offsetWidth + 8, 232)}px`;
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
        title="More"
        className={`flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-control text-sm font-medium md:px-3 ${colorTransition} ${
          isCurrent ? "bg-surface-muted text-foreground" : "text-muted hover:text-foreground"
        }`}
      >
        <span aria-hidden="true" className="md:hidden">
          <Ellipsis size={20} />
        </span>
        <span className="sr-only md:not-sr-only">More</span>
      </button>
      <div
        ref={menuRef}
        id={menuId}
        popover="auto"
        // m-0 and the explicit insets undo the popover's centring.
        className="fixed inset-auto m-0 w-56 -translate-x-full rounded-card border border-line bg-surface p-2 text-foreground shadow-lg"
      >
        <nav aria-label="More pages">
          <ul>
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={item.href === pathname ? "page" : undefined}
                  onClick={() => menuRef.current?.hidePopover()}
                  className={`flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-medium ${colorTransition} ${
                    item.href === pathname ? "bg-surface-muted" : "hover:bg-surface-muted"
                  }`}
                >
                  <span aria-hidden="true" className="text-muted">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}
