"use client";

import { useState } from "react";
import { cardClass, colorTransition } from "@/components/formStyles";
import { useAccountPreferences, useSetPreferences } from "@/lib/accountData";
import { addDays } from "@/lib/dates";
import { AvatarPicture } from "@/components/AvatarPicture";
import {
  AVATAR_LABELS,
  AVATARS,
  DATE_ORDERS,
  formatDay,
  type DateOrder,
  type Preferences,
  type Theme,
  type WeekStart,
  WEEK_STARTS,
} from "@/lib/preferences";
import { useToday } from "@/lib/useToday";

const THEME_LABELS: Record<Theme, string> = {
  system: "Same as this device",
  light: "Light",
  dark: "Dark",
};

const WEEK_START_LABELS: Record<WeekStart, string> = {
  monday: "Monday",
  sunday: "Sunday",
  saturday: "Saturday",
};

const DATE_LABELS: Record<DateOrder, string> = {
  "day-first": "Day first",
  "month-first": "Month first",
  numeric: "Numbers",
};

// A picture to pick: a ring shows the chosen one, and a second, offset
// ring the one the keyboard is on.
const pictureClass = `cursor-pointer rounded-full p-0.5 ring-2 ring-transparent ${colorTransition} hover:ring-line-strong has-checked:ring-accent has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent`;

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

  // A real example: ten days ago, in each format. (Today and yesterday read
  // as words, so they wouldn't show the difference.)
  const example = addDays(today, -10);

  return (
    <section
      aria-labelledby="preferences-heading"
      className={`${cardClass} max-w-lg p-4 sm:p-6 lg:max-w-none`}
    >
      <h2 id="preferences-heading" className="text-lg font-semibold">
        Preferences
      </h2>

      <fieldset className="mt-4">
        <legend className="text-sm font-medium">Your picture</legend>
        <p className="mt-0.5 text-sm text-muted">Shown on your account button and on the dashboard.</p>
        {/* Round pictures to pick from, each a radio: arrow keys move
            between them, and the chosen one has a green ring. */}
        <div className="mt-3 flex flex-wrap gap-3">
          <label className={pictureClass} title="No picture">
            <input
              type="radio"
              name="avatar"
              value=""
              checked={preferences.avatar === null}
              onChange={() => change({ avatar: null })}
              className="sr-only"
            />
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-line-strong text-xs text-muted">
              None
            </span>
          </label>
          {AVATARS.map((avatar) => (
            <label key={avatar} className={pictureClass} title={AVATAR_LABELS[avatar]}>
              <input
                type="radio"
                name="avatar"
                value={avatar}
                checked={preferences.avatar === avatar}
                onChange={() => change({ avatar })}
                className="sr-only"
              />
              <AvatarPicture avatar={avatar} size={56} label />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-6">
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
          {DATE_ORDERS.map((order) => (
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
                {DATE_LABELS[order]}{" "}
                <span className="text-muted">({formatDay(example, today, order)})</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="text-sm font-medium">Weeks start on</legend>
        <div className="mt-1 space-y-1">
          {WEEK_STARTS.map((start) => (
            <label key={start} className={optionClass}>
              <input
                type="radio"
                name="weekStart"
                value={start}
                checked={preferences.weekStart === start}
                onChange={() => change({ weekStart: start })}
                className="h-4 w-4 accent-accent"
              />
              <span className="text-sm">{WEEK_START_LABELS[start]}</span>
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
