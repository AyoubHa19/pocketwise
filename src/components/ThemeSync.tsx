"use client";

import { useEffect } from "react";
import { useAccountPreferences } from "@/lib/accountData";
import { THEME_COOKIE, type Theme } from "@/lib/preferences";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Puts the theme on the page now, and in the cookie for the next visit. */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${ONE_YEAR}; samesite=lax${secure}`;
}

/**
 * Keeps the page's theme in step with the account. The server already drew
 * the page from the cookie; this corrects it when the account says
 * otherwise (the first visit on a new device, or a change made elsewhere)
 * and applies a change made in Settings straight away. Draws nothing.
 */
export function ThemeSync() {
  const theme = useAccountPreferences()?.theme;
  useEffect(() => {
    if (theme) applyTheme(theme);
  }, [theme]);
  return null;
}
