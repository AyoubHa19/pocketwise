"use client";

import { useState, type FormEvent } from "react";
import { CurrencySelect } from "@/components/CurrencySelect";
import { cardClass, primaryButtonClass } from "@/components/formStyles";
import { useSetCurrency } from "@/lib/accountData";

/** Shown the first time, before the user has picked a currency. */
export function CurrencySetup() {
  const setCurrency = useSetCurrency();
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) {
      setError("Choose a currency to continue.");
      return;
    }
    // Once the account has the currency, the dashboard replaces this screen.
    setSaving(true);
    const saved = await setCurrency(selected);
    setSaving(false);
    if (!saved) {
      setError("Pocketwise couldn't save this to your account. Check your connection and try again.");
    }
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

        <button
          type="submit"
          disabled={saving}
          className={`mt-6 ${primaryButtonClass}`}
        >
          {saving ? "Saving…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
