"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

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
      className={`flex min-h-11 items-center rounded-md px-3 text-sm font-medium ${
        isCurrent
          ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      }`}
    >
      {children}
    </Link>
  );
}
