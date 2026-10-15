import { auth } from "@clerk/nextjs/server";
import { TransactionTracker } from "@/components/TransactionTracker";

export default async function Home() {
  // Signed out? Off to the sign-in page, which comes back here afterwards.
  await auth.protect();

  return (
    // The page's heading is the greeting at its top (DashboardHeader).
    <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <TransactionTracker />
    </section>
  );
}
