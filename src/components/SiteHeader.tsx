import Link from "next/link";
import { AccountButton } from "@/components/AvatarPicture";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WhenSignedIn } from "@/components/WhenSignedIn";

const brand = (
  <Link href="/" className="flex min-h-11 items-center gap-2.5 text-lg font-semibold tracking-tight">
    <Logo size={32} />
    Pocketwise
  </Link>
);

/**
 * The bar across the top. Signed in, it's for phones and tablets only (the
 * side bar does its job on large screens): the name, the theme and the
 * account button, which holds "Manage account" and "Sign out". The pages
 * themselves are in the bottom bar. Signed out, the name and the ways in
 * (Sign in, Get started).
 */
export function SiteHeader() {
  return (
    <>
      <WhenSignedIn>
        <header className="on-photo lg:hidden">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
            {brand}
            <div className="flex items-center gap-1">
              <ThemeToggle round />
              <div className="flex h-11 w-11 items-center justify-center">
                <AccountButton />
              </div>
            </div>
          </div>
        </header>
      </WhenSignedIn>
      <WhenSignedIn out>
        <header className="on-photo">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
            {brand}
            <nav aria-label="Account" className="flex items-center gap-1 sm:gap-2">
              <Link href="/sign-in" className="inline-flex min-h-11 items-center rounded-control px-3 text-sm font-medium hover:underline">
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex min-h-11 items-center rounded-control bg-accent px-4 text-sm font-medium text-accent-foreground hover:opacity-90"
              >
                Get started
              </Link>
            </nav>
          </div>
        </header>
      </WhenSignedIn>
    </>
  );
}
