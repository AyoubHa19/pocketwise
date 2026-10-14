"use client";

import { useState } from "react";
import { cardClass, colorTransition } from "@/components/formStyles";
import { useAccountPreferences, useSetPreferences } from "@/lib/accountData";
import { addDays, formatDayLabel } from "@/lib/dates";
import {
  dateLocale,
  type DateOrder,
  type Preferences,
  type Theme,
} from "@/lib/preferences";
import { useToday } from "@/lib/useToday";

const THEME_LABELS: Record<Theme, string> = {
  system: "Same as this device",
  light: "Light",
  dark: "Dark",
};

// Each option is a whole row you can tap (min 44px), with the radio inside.
const optionClass = `flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-3 hover:bg-surface-muted ${colorTransition}`;

/**
 * Settings: how Pocketwise looks. A change applies at once (the theme
 * through ThemeSync, dates on the dashboard) and is saved to the account,
 * so it follows the user to other devices.
 */
export function PreferencesForm() {
  const preferences = useAccountPreferences();
  const setPreferences = useSetPreferences();
  const today = useToday();
  const [status, setStatus] = useState<"idle" | "saved" | "failed">("idle");

  if (preferences === null) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  async function change(update: Partial<Preferences>) {
    setStatus("idle");
    setStatus((await setPreferences(update)) ? "saved" : "failed");
  }

  // A real example: ten days ago, in each order. (Today and yesterday read
  // as words, so they wouldn't show the difference.)
  const example = addDays(today, -10);
  const sample = (order: DateOrder) => formatDayLabel(example, today, dateLocale(order));

  return (
    <section
      aria-labelledby="preferences-heading"
      className={`${cardClass} max-w-lg p-4 sm:p-6 lg:max-w-none`}
    >
      <h2 id="preferences-heading" className="text-lg font-semibold">
        Preferences
      </h2>

      <fieldset className="mt-4">
        <legend className="text-sm font-medium">Theme</legend>
        <div className="mt-1 space-y-1">
          {(["system", "light", "dark"] as const).map((theme) => (
            <label key={theme} className={optionClass}>
              <input
                type="radio"
                name="theme"
                value={theme}
                checked={preferences.theme === theme}
                onChange={() => change({ theme })}
                className="h-4 w-4 accent-accent"
              />
              <span className="text-sm">{THEME_LABELS[theme]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="text-sm font-medium">Dates</legend>
        <div className="mt-1 space-y-1">
          {(["month-first", "day-first"] as const).map((order) => (
            <label key={order} className={optionClass}>
              <input
                type="radio"
                name="dateOrder"
                value={order}
                checked={preferences.dateOrder === order}
                onChange={() => change({ dateOrder: order })}
                className="h-4 w-4 accent-accent"
              />
              <span className="text-sm">
                {order === "month-first" ? "Month first" : "Day first"}{" "}
                <span className="text-muted">({sample(order)})</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Always on the page, so screen readers hear each change. */}
      <p
        role="status"
        className={status === "idle" ? "sr-only" : `mt-4 text-sm ${status === "saved" ? "text-positive" : "text-danger"}`}
      >
        {status === "saved"
          ? "Saved."
          : status === "failed"
            ? "Pocketwise couldn't save this to your account. Check your connection and try again."
            : ""}
      </p>
    </section>
  );
}
