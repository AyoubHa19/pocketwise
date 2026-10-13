import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center px-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Pocketwise
        </Link>
      </div>
    </header>
  );
}
