import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
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
 * themselves are in the bottom bar. Signed out, just the name.
 */
export function SiteHeader() {
  return (
    <>
      <WhenSignedIn>
        <header className="lg:hidden">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
            {brand}
            <div className="flex items-center gap-1">
              <ThemeToggle round />
              <div className="flex h-11 w-11 items-center justify-center">
                <UserButton />
              </div>
            </div>
          </div>
        </header>
      </WhenSignedIn>
      <WhenSignedIn out>
        <header>
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center px-4 sm:px-6">{brand}</div>
        </header>
      </WhenSignedIn>
    </>
  );
}
