"use client";

import { useState, type FormEvent } from "react";
import { CurrencySelect } from "@/components/CurrencySelect";
import { cardClass, primaryButtonClass } from "@/components/formStyles";
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

  // Centred with a short welcome: it's the first thing a new user sees, so
  // it says what Pocketwise is before asking for anything.
  return (
    <div className="mx-auto max-w-lg sm:py-8">
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Welcome to Pocketwise
      </h2>
      <p className="mt-2 text-muted">
        Track your income and spending, month by month.
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        className={`${cardClass} mt-6 p-4 sm:p-6`}
      >
        <h3 className="text-lg font-semibold">Choose your currency</h3>
        <p className="mt-1 text-sm text-muted">
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
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        )}

        <button type="submit" className={`mt-6 ${primaryButtonClass}`}>
          Continue
        </button>
      </form>
    </div>
  );
}
