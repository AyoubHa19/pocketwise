"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { pressable } from "@/components/formStyles";
import { useAccountPreferences, useSetPreferences } from "@/lib/accountData";
import type { Theme } from "@/lib/preferences";

/** Each press moves on to the next: device's own, light, dark, and round. */
const NEXT: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<Theme, string> = { system: "Same as device", light: "Light", dark: "Dark" };
const ICON = { system: Monitor, light: Sun, dark: Moon };

/**
 * The header's theme button. It shows the current theme's icon and steps
 * through the three on each press, saving to the account like the choice
 * in Settings (the two always agree; ThemeSync applies it to the page).
 * The label says both where you are and where a press takes you.
 */
export function ThemeToggle({ round = false }: { round?: boolean }) {
  const theme = useAccountPreferences()?.theme;
  const setPreferences = useSetPreferences();
  // Until the account's preference arrives, keep the space but stay quiet.
  if (!theme) return <span className="h-11 w-11" aria-hidden="true" />;

  const Icon = ICON[theme];
  const next = NEXT[theme];
  const label = `Theme: ${LABEL[theme]}. Switch to ${LABEL[next]}.`;
  return (
    <button
      type="button"
      onClick={() => void setPreferences({ theme: next })}
      aria-label={label}
      title={label}
      className={`flex h-11 w-11 items-center justify-center ${round ? "rounded-full" : "rounded-control"} text-muted hover:bg-surface-muted hover:text-foreground ${pressable}`}
    >
      <Icon aria-hidden="true" size={20} strokeWidth={2} />
    </button>
  );
}
