import { useSyncExternalStore } from "react";
import { createStorageStore } from "@/lib/createStorageStore";
import { isSupportedCurrency } from "@/lib/money";

export type Settings = {
  /** The currency new transactions use, or null until the user picks one. */
  currency: string | null;
};

const SETTINGS_STORAGE_KEY = "pocketwise.settings";
const SETTINGS_VERSION = 1;

const DEFAULT_SETTINGS: Settings = { currency: null };

// Unlike transactions, losing unreadable settings costs nothing: the user is
// simply asked to pick a currency again. So there's no backup here.
function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw === null) return DEFAULT_SETTINGS;
    const data = JSON.parse(raw) as { version?: unknown; currency?: unknown };
    if (
      data.version === SETTINGS_VERSION &&
      typeof data.currency === "string" &&
      isSupportedCurrency(data.currency)
    ) {
      return { currency: data.currency };
    }
  } catch {
    // Blocked storage or unreadable data: fall through to the defaults.
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: Settings): boolean {
  try {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ version: SETTINGS_VERSION, ...settings }),
    );
    return true;
  } catch {
    return false;
  }
}

const store = createStorageStore({
  key: SETTINGS_STORAGE_KEY,
  load: loadSettings,
  save: saveSettings,
});

/** The saved settings, or null while the page hasn't read them yet. */
export function useSettings(): Settings | null {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
}

/** Saves the currency for new transactions. Returns whether it was saved. */
export function setCurrency(currency: string): boolean {
  return store.update((previous) => ({ ...previous, currency }));
}
