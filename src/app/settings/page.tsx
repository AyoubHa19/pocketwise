import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { AccountCard } from "@/components/AccountCard";
import { CategoriesCard } from "@/components/CategoriesCard";
import { PreferencesForm } from "@/components/PreferencesForm";
import { SettingsForm } from "@/components/SettingsForm";
import { YourDataCard } from "@/components/YourDataCard";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  // Signed out? Off to the sign-in page, which comes back here afterwards.
  await auth.protect();

  // The same spacing as the dashboard, so the title doesn't jump down when
  // you move between the two pages.
  // The cards sit two by two from lg, where one would leave the right half
  // of the page empty; Categories, the longest, takes the full width with
  // its two lists side by side.
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Settings
      </h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-x-10">
        <AccountCard />
        <PreferencesForm />
        <SettingsForm />
        <YourDataCard />
        <CategoriesCard />
      </div>
    </section>
  );
}
