"use client";

import { useState, type FormEvent } from "react";
import { CurrencySelect } from "@/components/CurrencySelect";
import { cardClass, primaryButtonClass } from "@/components/formStyles";
import { currencyOptions } from "@/lib/money";
import { setCurrency, useSettings } from "@/lib/settingsStore";

type Status = "idle" | "saved" | "failed";

export function SettingsForm() {
  const settings = useSettings();
  // null until the user picks something; until then, show the saved choice.
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  // Settings come from the browser's storage, so wait until they're read.
  if (settings === null) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  const currency = selected ?? settings.currency ?? "";
  const currencyName = currencyOptions().find((o) => o.code === currency)?.name;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currency) return;
    setStatus(setCurrency(currency) ? "saved" : "failed");
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={`${cardClass} max-w-lg p-4 sm:p-6 lg:max-w-none`}
    >
      <h2 className="text-lg font-semibold">Currency</h2>
      <p className="mt-1 text-sm text-muted">
        Used for the transactions you add from now on. Changing it doesn&apos;t
        convert transactions you&apos;ve already added: they keep their own
        currency.
      </p>

      <label className="mt-4 block text-sm font-medium">
        Currency
        <CurrencySelect
          value={currency}
          onChange={(code) => {
            setSelected(code);
            setStatus("idle");
          }}
        />
      </label>

      <button
        type="submit"
        disabled={!currency}
        className={`mt-6 ${primaryButtonClass}`}
      >
        Save
      </button>

      {status === "saved" && (
        <p role="status" className="mt-4 text-sm text-positive">
          Saved. New transactions will use {currencyName} ({currency}).
        </p>
      )}
      {status === "failed" && (
        <p role="alert" className="mt-4 text-sm text-danger">
          Your browser didn&apos;t let Pocketwise save. Storage may be full, or
          blocked by private browsing or privacy settings.
        </p>
      )}
    </form>
  );
}
