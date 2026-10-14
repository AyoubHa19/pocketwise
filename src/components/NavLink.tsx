"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { colorTransition } from "@/components/formStyles";

type Props = {
  href: string;
  /** The link's name, shown as text from sm up. */
  children: string;
  /** Shown instead of the text on phones, where the header is narrow. */
  icon: ReactNode;
};

/**
 * A header link that looks selected while you're on its page. On phones
 * it's an icon, with its name still there for screen readers and as a
 * tooltip, so the whole header fits on one line.
 */
export function NavLink({ href, children, icon }: Props) {
  const isCurrent = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={isCurrent ? "page" : undefined}
      title={children}
      className={`flex min-h-11 min-w-11 items-center justify-center rounded-control text-sm font-medium sm:px-3 ${colorTransition} ${
        isCurrent
          ? "bg-surface-muted text-foreground"
          : "text-muted hover:text-foreground"
      }`}
    >
      <span aria-hidden="true" className="sm:hidden">
        {icon}
      </span>
      <span className="sr-only sm:not-sr-only">{children}</span>
    </Link>
  );
}
