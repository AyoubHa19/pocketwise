import { Show, UserButton } from "@clerk/nextjs";
import { LayoutDashboard, ListFilter, PiggyBank, Repeat, Settings, Target, Wallet } from "lucide-react";
import Link from "next/link";
import { MoreMenu } from "@/components/MoreMenu";
import { NavLink } from "@/components/NavLink";
import { ThemeToggle } from "@/components/ThemeToggle";

const logoClass = "min-h-11 items-center text-lg font-semibold tracking-tight";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        {/* Signed in, under sm (640px), the name makes way for the five
            links; the Dashboard link leads home just the same. Signed out
            there are no links, so it always shows. */}
        <Show when="signed-in">
          <Link href="/" className={`hidden sm:flex ${logoClass}`}>
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
              <NavLink href="/budgets" icon={<PiggyBank size={20} />}>
                Budgets
              </NavLink>
              <NavLink href="/goals" icon={<Target size={20} />}>
                Goals
              </NavLink>
              {/* The pages used less often, so the header keeps fitting as
                  Pocketwise grows. */}
              <MoreMenu
                items={[
                  { href: "/bills", label: "Bills", icon: <Repeat size={18} /> },
                  { href: "/accounts", label: "Accounts", icon: <Wallet size={18} /> },
                  { href: "/settings", label: "Settings", icon: <Settings size={18} /> },
                ]}
              />
            </nav>
            {/* Under 400px, the five, this and the account button don't fit
                at a finger's 44px each; the theme is also in Settings. */}
            <div className="hidden min-[400px]:block">
              <ThemeToggle />
            </div>
            <div className="flex h-11 w-11 items-center justify-center">
              <UserButton />
            </div>
          </div>
        </Show>
      </div>
    </header>
  );
}
