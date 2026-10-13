"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { colorTransition } from "@/components/formStyles";

type Props = {
  href: string;
  children: ReactNode;
};

/** A header link that looks selected while you're on its page. */
export function NavLink({ href, children }: Props) {
  const isCurrent = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={isCurrent ? "page" : undefined}
      className={`flex min-h-11 items-center rounded-control px-3 text-sm font-medium ${colorTransition} ${
        isCurrent
          ? "bg-surface-muted text-foreground"
          : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
