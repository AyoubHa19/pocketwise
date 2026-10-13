import { auth } from "@clerk/nextjs/server";
import { TransactionTracker } from "@/components/TransactionTracker";

export default async function Home() {
  // Signed out? Off to the sign-in page, which comes back here afterwards.
  await auth.protect();

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Hidden on screen, where the month summary speaks for itself, but
          screen readers start from the page's h1 to know where they are. */}
      <h1 className="sr-only">Dashboard</h1>
      <TransactionTracker />
    </section>
  );
}
