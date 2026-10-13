import type { Metadata } from "next";
import { OpeningBalanceForm } from "@/components/OpeningBalanceForm";
import { SettingsForm } from "@/components/SettingsForm";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Settings
      </h1>
      <SettingsForm />
      <OpeningBalanceForm />
    </section>
  );
}
