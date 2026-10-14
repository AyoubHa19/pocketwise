import { Show, UserButton } from "@clerk/nextjs";
import { LayoutDashboard, ListFilter, Settings, Wallet } from "lucide-react";
import Link from "next/link";
import { NavLink } from "@/components/NavLink";
import { ThemeToggle } from "@/components/ThemeToggle";

const logoClass = "min-h-11 items-center text-lg font-semibold tracking-tight";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        {/* Signed in, on narrow phones (under 400px), the name makes way for
            the links; the Dashboard link leads home just the same. Signed
            out there are no links, so it always shows. */}
        <Show when="signed-in">
          <Link href="/" className={`hidden min-[400px]:flex ${logoClass}`}>
            Pocketwise
          </Link>
        </Show>
        <Show when="signed-out">
          <Link href="/" className={`flex ${logoClass}`}>
            Pocketwise
          </Link>
        </Show>
        {/* Only once signed in: on the sign-in page, these would just lead
            back to it. The account button holds "Manage account" and
            "Sign out". */}
        <Show when="signed-in">
          <div className="ml-auto flex items-center gap-1 sm:gap-3">
            <nav aria-label="Main" className="flex gap-1">
              <NavLink href="/" icon={<LayoutDashboard size={20} />}>
                Dashboard
              </NavLink>
              <NavLink href="/transactions" icon={<ListFilter size={20} />}>
                Transactions
              </NavLink>
              <NavLink href="/accounts" icon={<Wallet size={20} />}>
                Accounts
              </NavLink>
              <NavLink href="/settings" icon={<Settings size={20} />}>
                Settings
              </NavLink>
            </nav>
            <ThemeToggle />
            <div className="flex h-11 w-11 items-center justify-center">
              <UserButton />
            </div>
          </div>
        </Show>
      </div>
    </header>
  );
}
