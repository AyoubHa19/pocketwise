import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { ReportsView } from "@/components/ReportsView";

export const metadata: Metadata = {
  title: "Reports",
};

export default async function ReportsPage() {
  // Signed out? Off to the sign-in page, which comes back here afterwards.
  await auth.protect();

  // The same spacing as the other pages, so nothing jumps between them.
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Reports</h1>
      <div className="mt-6">
        <ReportsView />
      </div>
    </section>
  );
}
