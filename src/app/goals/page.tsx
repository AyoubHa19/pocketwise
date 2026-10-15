import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { GoalsManager } from "@/components/GoalsManager";

export const metadata: Metadata = {
  title: "Goals",
};

export default async function GoalsPage() {
  // Signed out? Off to the sign-in page, which comes back here afterwards.
  await auth.protect();

  // The same spacing as the other pages, so nothing jumps between them.
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Savings goals</h1>
      <div className="mt-6">
        <GoalsManager />
      </div>
    </section>
  );
}
