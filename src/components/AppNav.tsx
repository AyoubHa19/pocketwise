"use client";

import { UserButton } from "@clerk/nextjs";
import {
  CalendarDays,
  ChartColumn,
  Ellipsis,
  FlaskConical,
  Gauge,
  Landmark,
  LayoutDashboard,
  ListFilter,
  PiggyBank,
  Repeat,
  Settings,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef } from "react";
import { colorTransition } from "@/components/formStyles";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

type Item = { href: string; label: string; icon: LucideIcon };

// Used every day: always in view, on the side bar and the phone's bottom bar.
const DAILY: Item[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ListFilter },
  { href: "/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/goals", label: "Goals", icon: Target },
];

// Used often: on the side bar too, under "More" on phones.
const OFTEN: Item[] = [
  { href: "/plan", label: "Plan to payday", icon: Gauge },
  { href: "/bills", label: "Bills", icon: Repeat },
  { href: "/reports", label: "Reports", icon: ChartColumn },
];

// Now and then: under "More" everywhere, so the side bar fits a laptop's
// height without scrolling.
const SOMETIMES: Item[] = [
  { href: "/debts", label: "Debts", icon: Landmark },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/what-if", label: "What if", icon: FlaskConical },
  { href: "/accounts", label: "Accounts", icon: Wallet },
];

const SETTINGS: Item = { href: "/settings", label: "Settings", icon: Settings };

/**
 * Large screens (lg, 1024px, up): a white bar of round icons down the left,
 * the current page's in black. Each icon's name is there for screen
 * readers, and shows beside it on hover or keyboard focus.
 */
export function SideRail() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh shrink-0 py-4 pl-4 lg:block">
      <div className="flex h-full w-[4.5rem] flex-col items-center rounded-[2.25rem] border border-card-edge bg-surface py-4 shadow-card">
        <Link href="/" aria-label="Pocketwise, Dashboard" className="flex h-11 w-11 items-center justify-center">
          <Logo size={40} />
        </Link>
        <nav aria-label="Main" className="mt-4 flex min-h-0 flex-1 flex-col items-center justify-between overflow-y-auto overflow-x-visible">
          <ul className="flex flex-col items-center gap-1.5">
            {[...DAILY, ...OFTEN].map((item) => (
              <li key={item.href}>
                <RailLink item={item} current={item.href === pathname} />
              </li>
            ))}
            <li>
              <MoreButton items={SOMETIMES} pathname={pathname} placement="right" />
            </li>
          </ul>
          <ul className="mt-4 flex flex-col items-center gap-1.5 border-t border-line pt-4">
            <li>
              <RailLink item={SETTINGS} current={SETTINGS.href === pathname} />
            </li>
          </ul>
        </nav>
        <div className="mt-2 flex flex-col items-center gap-1.5">
          <ThemeToggle round />
          <div className="flex h-11 w-11 items-center justify-center">
            <UserButton />
          </div>
        </div>
      </div>
    </aside>
  );
}

const railItemClass = (current: boolean) =>
  `group relative flex h-11 w-11 items-center justify-center rounded-full ${colorTransition} ${
    current ? "bg-ink text-ink-foreground" : "text-muted hover:bg-surface-muted hover:text-foreground"
  }`;

/** The name, beside a side bar icon on hover and keyboard focus. Fixed, so
    the side bar's scrolling can't clip it: 100px from the left is just
    past the side bar (16px gap + 72px wide + 12px). Its height is where
    the icon is (left at its natural place). */
function RailTip({ label }: { label: string }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none fixed left-25 z-30 rounded-control bg-ink px-2.5 py-1 text-xs font-medium whitespace-nowrap text-ink-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {label}
    </span>
  );
}

function RailLink({ item, current }: { item: Item; current: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} aria-current={current ? "page" : undefined} className={railItemClass(current)}>
      <Icon aria-hidden="true" size={20} strokeWidth={current ? 2.25 : 2} />
      <span className="sr-only">{item.label}</span>
      <RailTip label={item.label} />
    </Link>
  );
}

/**
 * Phones and tablets (under lg): a floating bar along the bottom, within
 * thumb's reach, with the four daily pages and "More" for the rest.
 */
export function BottomNav() {
  const pathname = usePathname();
  const more = [...OFTEN, ...SOMETIMES, SETTINGS];
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 mx-auto max-w-md rounded-[1.75rem] border border-card-edge bg-surface p-1.5 shadow-[0_8px_30px_rgb(23_26_23/0.12)] lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {DAILY.map((item) => (
          <li key={item.href}>
            <BottomLink item={item} current={item.href === pathname} />
          </li>
        ))}
        <li>
          <MoreButton items={more} pathname={pathname} placement="above" />
        </li>
      </ul>
    </nav>
  );
}

const bottomItemClass = (current: boolean) =>
  `flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-[1.25rem] text-[0.6875rem] font-medium ${colorTransition} ${
    current ? "text-foreground" : "text-muted hover:text-foreground"
  }`;

function BottomIcon({ icon: Icon, current }: { icon: LucideIcon; current: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-8 w-12 items-center justify-center rounded-full ${colorTransition} ${
        current ? "bg-ink text-ink-foreground" : ""
      }`}
    >
      <Icon size={19} strokeWidth={current ? 2.25 : 2} />
    </span>
  );
}

function BottomLink({ item, current }: { item: Item; current: boolean }) {
  return (
    <Link href={item.href} aria-current={current ? "page" : undefined} className={bottomItemClass(current)}>
      <BottomIcon icon={item.icon} current={current} />
      {/* Short names, so all five fit on a 320px phone. */}
      {item.label === "Transactions" ? (
        <>
          <span aria-hidden="true">Activity</span>
          <span className="sr-only">Transactions</span>
        </>
      ) : (
        item.label
      )}
    </Link>
  );
}

/**
 * "More" opens a menu with the other pages: above the phone's bottom bar,
 * or beside the side bar. It's the browser's popover, which closes on Esc
 * or a tap outside; the menu comes right after the button, so Tab goes
 * from one into the other. The button looks selected on one of its pages.
 */
function MoreButton({ items, pathname, placement }: { items: Item[]; pathname: string; placement: "above" | "right" }) {
  const current = items.some((item) => item.href === pathname);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // A popover sits in the middle of the screen by default; this puts it
  // just above the bar, lined up with its right edge, each time it opens.
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    function place(event: Event) {
      if ((event as ToggleEvent).newState !== "open" || !buttonRef.current || !menu) return;
      if (placement === "right") {
        // Beside the side bar, its top level with the button, kept on screen.
        const button = buttonRef.current.getBoundingClientRect();
        const rail = buttonRef.current.closest("aside > div")?.getBoundingClientRect() ?? button;
        menu.style.left = `${rail.right + 12}px`;
        menu.style.top = `${Math.max(8, Math.min(button.top, window.innerHeight - menu.offsetHeight - 8))}px`;
        return;
      }
      const bar = buttonRef.current.closest("nav")?.getBoundingClientRect();
      if (!bar) return;
      menu.style.bottom = `${window.innerHeight - bar.top + 8}px`;
      menu.style.right = `${document.documentElement.clientWidth - bar.right}px`;
    }
    menu.addEventListener("beforetoggle", place);
    return () => menu.removeEventListener("beforetoggle", place);
  }, [placement]);

  return (
    <>
      {placement === "right" ? (
        <button ref={buttonRef} type="button" popoverTarget={menuId} className={railItemClass(current)}>
          <Ellipsis aria-hidden="true" size={20} />
          <span className="sr-only">More</span>
          <RailTip label="More" />
        </button>
      ) : (
        <button ref={buttonRef} type="button" popoverTarget={menuId} className={bottomItemClass(current)}>
          <BottomIcon icon={Ellipsis} current={current} />
          More
        </button>
      )}
      <div
        ref={menuRef}
        id={menuId}
        popover="auto"
        // m-0 and the explicit insets undo the popover's centring.
        className="fixed inset-auto m-0 w-60 rounded-card border border-card-edge bg-surface p-2 text-foreground shadow-[0_8px_30px_rgb(23_26_23/0.16)]"
      >
        <nav aria-label="More pages">
          <ul>
            {items.map((item) => {
              const Icon = item.icon;
              const here = item.href === pathname;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={here ? "page" : undefined}
                    onClick={() => menuRef.current?.hidePopover()}
                    className={`flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-medium ${colorTransition} ${
                      here ? "bg-surface-muted" : "hover:bg-surface-muted"
                    }`}
                  >
                    <Icon aria-hidden="true" size={18} className="text-muted" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}
