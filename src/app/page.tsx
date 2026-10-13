import { TransactionTracker } from "@/components/TransactionTracker";

export default function Home() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Hidden on screen, where the month summary speaks for itself, but
          screen readers start from the page's h1 to know where they are. */}
      <h1 className="sr-only">Transactions</h1>
      <TransactionTracker />
    </section>
  );
}
