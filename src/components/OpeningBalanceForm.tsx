"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  cardClass,
  dangerButtonClass,
  fieldClass,
  primaryButtonClass,
} from "@/components/formStyles";
import { amountToInputText, currencyDecimals, parseBalance } from "@/lib/money";
import { setOpeningBalance, useSettings } from "@/lib/settingsStore";
import { useToday } from "@/lib/useToday";

type Status = "idle" | "saved" | "removed" | "failed";

/** Settings: what the account held when the user started tracking. */
export function OpeningBalanceForm() {
  const settings = useSettings();
  const today = useToday();
  // null until the user types or picks something; until then, show what's saved.
  const [amountText, setAmountText] = useState<string | null>(null);
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const formRef = useRef<HTMLFormElement>(null);
  const ready = settings !== null && settings.currency !== null;

  // The "Set up" link opens /settings#starting-balance, but the browser
  // looks for that spot as soon as the page opens, before this form exists
  // (it waits for the saved settings). So scroll to it once it appears.
  useEffect(() => {
    if (ready && window.location.hash === "#starting-balance") {
      formRef.current?.scrollIntoView({ block: "start" });
    }
  }, [ready]);

  // The currency form above shows "Loading…" and the first-run choice.
  if (settings === null || settings.currency === null) return null;

  const saved = settings.openingBalance;
  const currency = settings.currency;
  const amount = amountText ?? (saved ? amountToInputText(saved) : "");
  const date = pickedDate ?? saved?.date ?? today;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountMinor = parseBalance(amount, currency);
    if (amountMinor === null) {
      const decimals = currencyDecimals(currency);
      setError(
        `Enter an amount like ${decimals === 0 ? "3000" : "3000.00"}, or with a minus for an overdraft, like -250.`,
      );
      return;
    }
    if (!date) {
      setError("Pick a date.");
      return;
    }
    setError(null);
    setStatus(setOpeningBalance({ amountMinor, currency, date }) ? "saved" : "failed");
  }

  function handleRemove() {
    setAmountText(null);
    setPickedDate(null);
    setError(null);
    setStatus(setOpeningBalance(null) ? "removed" : "failed");
  }

  function changed() {
    setStatus("idle");
    setError(null);
  }

  return (
    <form
      id="starting-balance"
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className={`${cardClass} mt-6 max-w-lg scroll-mt-6 p-4 sm:p-6`}
    >
      <h2 className="text-lg font-semibold">Starting balance</h2>
      <p className="mt-1 text-sm text-muted">
        How much was in your account at the start of a day. Pocketwise adds
        the transactions from that day on to show your account balance.
      </p>

      {saved && saved.currency !== currency && (
        <p className="mt-3 text-sm text-muted">
          It&apos;s saved in {saved.currency}. Saving again records it in{" "}
          {currency}; the amount isn&apos;t converted.
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Amount ({currency})
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder={currencyDecimals(currency) === 0 ? "0" : "0.00"}
            value={amount}
            onChange={(event) => {
              setAmountText(event.target.value);
              changed();
            }}
            aria-invalid={error !== null ? true : undefined}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm font-medium">
          At the start of
          <input
            type="date"
            value={date}
            onChange={(event) => {
              setPickedDate(event.target.value);
              changed();
            }}
            className={fieldClass}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="submit" className={primaryButtonClass}>
          Save
        </button>
        {saved && (
          <button type="button" onClick={handleRemove} className={dangerButtonClass}>
            Remove
          </button>
        )}
      </div>

      {status === "saved" && (
        <p role="status" className="mt-4 text-sm text-positive">
          Saved. Your account balance is on the Transactions page.
        </p>
      )}
      {status === "removed" && (
        <p role="status" className="mt-4 text-sm text-muted">
          Removed. Pocketwise no longer shows an account balance.
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
