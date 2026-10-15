import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { TransactionsBrowser } from "@/components/TransactionsBrowser";

export const metadata: Metadata = {
  title: "Transactions",
};

export default async function TransactionsPage() {
  // Signed out? Off to the sign-in page, which comes back here afterwards.
  await auth.protect();

  // The same spacing as the other pages, so nothing jumps between them.
  // Suspense: the filters are read from the address (useSearchParams).
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <Suspense fallback={<p className="text-sm text-muted">Loading your transactions…</p>}>
        <TransactionsBrowser />
      </Suspense>
    </section>
  );
}
