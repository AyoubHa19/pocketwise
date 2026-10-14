"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { CurrencySelect } from "@/components/CurrencySelect";
import {
  cardClass,
  fieldClass,
  pressable,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/formStyles";
import {
  useAccountPreferences,
  useAccounts,
  useAccountSettings,
  useAccountTransactions,
  useRates,
  useRemoveRate,
  useSaveRate,
} from "@/lib/accountData";
import { DEFAULT_PREFERENCES, formatDay } from "@/lib/preferences";
import { findRate, MAX_SOURCE_LENGTH, rateProblem, rateText, type ExchangeRate } from "@/lib/rates";
import { useToday } from "@/lib/useToday";

const chipClass = `inline-flex min-h-11 items-center rounded-control border border-line-strong px-3 text-sm font-medium hover:bg-surface-muted ${pressable}`;
const iconButtonClass = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-muted hover:bg-surface-muted hover:text-foreground ${pressable}`;

type Draft = Omit<ExchangeRate, "id">;

/**
 * Settings: the exchange rates the user enters, to see totals across
 * currencies (PRD 11). Each has its date and source; Pocketwise never
 * fetches one. Currencies in use without a rate are pointed out.
 */
export function RatesCard() {
  const rates = useRates();
  const settings = useAccountSettings();
  const accounts = useAccounts();
  const transactions = useAccountTransactions();
  const preferences = useAccountPreferences();
  const saveRate = useSaveRate();
  const removeRate = useRemoveRate();
  const today = useToday();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  if (rates === null || settings === null || accounts === null || transactions === null) {
    return <p className="text-sm text-muted">Loading…</p>;
  }
  const main = settings.currency ?? "";
  const dateOrder = preferences?.dateOrder ?? DEFAULT_PREFERENCES.dateOrder;
  // Currencies the user has besides the main one, and which lack a rate to it.
  const used = new Set([...accounts.map((a) => a.currency), ...transactions.map((t) => t.amount.currency)]);
  used.delete(main);
  const needed = [...used].filter((c) => main && !findRate(rates, c, main)).sort();

  function open(start: Draft) {
    setError(null);
    setStatus("");
    setDraft(start);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const values = { ...draft, rate: draft.rate.trim(), source: draft.source.trim() };
    const problem = rateProblem(values);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    const result = await saveRate(values);
    setSaving(false);
    if (result.ok) {
      setDraft(null);
      setStatus(`Saved: ${rateText(values)}.`);
    } else {
      setError(result.message);
    }
  }

  return (
    <section aria-labelledby="rates-heading" className={`${cardClass} p-4 sm:p-6 lg:col-span-2`}>
      <h2 id="rates-heading" className="text-lg font-semibold">
        Exchange rates
      </h2>
      <p className="mt-1 max-w-prose text-sm text-muted">
        To see totals across currencies, enter the rates you use (from your bank, a receipt or a website).
        Converted amounts are always shown as converted, with the rate and its date; your transactions keep
        their own currency. Pocketwise doesn&apos;t fetch live rates.
      </p>

      {needed.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span>No rate yet for:</span>
          {needed.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Add a rate from ${c} to ${main}`}
              onClick={() => open({ from: c, to: main, rate: "", date: today, source: "" })}
              className={chipClass}
            >
              {c} → {main}
            </button>
          ))}
        </p>
      )}

      {rates.length > 0 && (
        <ul className="mt-4 divide-y divide-line">
          {rates.map((r) => (
            <li key={r.id} className="flex min-h-14 items-center gap-3 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="font-medium tabular-nums">{rateText(r)}</p>
                <p className="text-xs text-muted">
                  Rate from {formatDay(r.date, today, dateOrder)}
                  {r.source && ` · ${r.source}`}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Change the rate ${rateText(r)}`}
                title="Change"
                onClick={() => open({ from: r.from, to: r.to, rate: r.rate, date: today, source: r.source })}
                className={iconButtonClass}
              >
                <Pencil size={18} strokeWidth={1.75} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`Delete the rate ${rateText(r)}`}
                title="Delete"
                onClick={async () => {
                  const result = await removeRate(r.id);
                  setStatus(result.ok ? `Deleted: ${rateText(r)}.` : result.message);
                }}
                className={`${iconButtonClass} hover:text-danger`}
              >
                <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {draft ? (
        <form onSubmit={submit} noValidate className="mt-4 border-t border-line pt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm font-medium">
              1 of
              <CurrencySelect value={draft.from} onChange={(from) => setDraft({ ...draft, from })} />
            </label>
            <label className="block text-sm font-medium">
              Is worth (in)
              <CurrencySelect value={draft.to} onChange={(to) => setDraft({ ...draft, to })} />
            </label>
            <label className="block text-sm font-medium">
              Rate
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                autoFocus
                placeholder="Like: 4.28"
                value={draft.rate}
                onChange={(event) => setDraft({ ...draft, rate: event.target.value })}
                className={fieldClass}
              />
            </label>
            <label className="block text-sm font-medium">
              Rate from
              <input
                type="date"
                value={draft.date}
                onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                className={fieldClass}
              />
            </label>
            <label className="block text-sm font-medium sm:col-span-2">
              Where it&apos;s from <span className="font-normal text-muted">(optional)</span>
              <input
                type="text"
                maxLength={MAX_SOURCE_LENGTH}
                autoComplete="off"
                placeholder="Like: My bank, xe.com"
                value={draft.source}
                onChange={(event) => setDraft({ ...draft, source: event.target.value })}
                className={fieldClass}
              />
            </label>
          </div>
          {draft.from && draft.to && draft.rate && (
            <p className="mt-3 text-sm text-muted">{rateText(draft)}</p>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button type="submit" disabled={saving} className={primaryButtonClass}>
              Save rate
            </button>
            <button type="button" onClick={() => setDraft(null)} className={secondaryButtonClass}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => open({ from: needed[0] ?? "", to: main, rate: "", date: today, source: "" })}
            className={secondaryButtonClass}
          >
            Add a rate
          </button>
        </div>
      )}

      <p role="status" className={status ? "mt-3 text-sm text-positive" : "sr-only"}>
        {status}
      </p>
    </section>
  );
}
