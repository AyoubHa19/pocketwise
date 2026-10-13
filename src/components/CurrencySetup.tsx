"use client";

import { useState, type FormEvent } from "react";
import { CurrencySelect } from "@/components/CurrencySelect";
import { primaryButtonClass } from "@/components/formStyles";
import { setCurrency } from "@/lib/settingsStore";

/** Shown the first time, before the user has picked a currency. */
export function CurrencySetup() {
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) {
      setError("Choose a currency to continue.");
      return;
    }
    // If the browser refuses to save, the choice still applies until the page
    // is closed, and the transaction list warns once something can't be saved.
    setCurrency(selected);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="max-w-lg rounded-lg border border-zinc-200 p-4 sm:p-6 dark:border-zinc-800"
    >
      <h2 className="text-lg font-semibold">Choose your currency</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Pocketwise uses it for the transactions you add. You can change it
        later in Settings.
      </p>

      <label className="mt-4 block text-sm font-medium">
        Currency
        <CurrencySelect
          value={selected}
          onChange={(code) => {
            setSelected(code);
            setError(null);
          }}
        />
      </label>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button type="submit" className={`mt-6 ${primaryButtonClass}`}>
        Continue
      </button>
    </form>
  );
}
