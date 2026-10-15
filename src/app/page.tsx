import { auth } from "@clerk/nextjs/server";
import { Landing } from "@/components/Landing";
import { TransactionTracker } from "@/components/TransactionTracker";

export default async function Home() {
  // Visitors who aren't signed in see what Pocketwise is, with the ways in.
  const { userId } = await auth();
  if (!userId) return <Landing />;

  return (
    // The page's heading is the greeting at its top (DashboardHeader).
    <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <TransactionTracker />
    </section>
  );
}
