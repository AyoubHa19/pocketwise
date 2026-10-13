import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { NavLink } from "@/components/NavLink";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-h-11 items-center text-lg font-semibold tracking-tight"
        >
          Pocketwise
        </Link>
        {/* Only once signed in: on the sign-in page, these would just lead
            back to it. The account button holds "Manage account" and
            "Sign out". */}
        <Show when="signed-in">
          <div className="flex items-center gap-1 sm:gap-3">
            <nav aria-label="Main" className="flex gap-1">
              <NavLink href="/">Dashboard</NavLink>
              <NavLink href="/settings">Settings</NavLink>
            </nav>
            <div className="flex h-11 w-11 items-center justify-center">
              <UserButton />
            </div>
          </div>
        </Show>
      </div>
    </header>
  );
}
