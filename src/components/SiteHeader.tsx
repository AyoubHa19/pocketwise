import Link from "next/link";
import { NavLink } from "@/components/NavLink";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-h-11 items-center text-lg font-semibold tracking-tight"
        >
          Pocketwise
        </Link>
        <nav aria-label="Main" className="flex gap-1">
          <NavLink href="/">Transactions</NavLink>
          <NavLink href="/settings">Settings</NavLink>
        </nav>
      </div>
    </header>
  );
}
