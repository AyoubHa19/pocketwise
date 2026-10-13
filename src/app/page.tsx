import { TransactionTracker } from "@/components/TransactionTracker";

export default function Home() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Welcome to Pocketwise
      </h1>
      <p className="mt-4 max-w-prose text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        A simple way to keep track of your income, spending, and budgets.
      </p>

      <TransactionTracker />
    </section>
  );
}
