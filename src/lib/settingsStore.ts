import { useSyncExternalStore } from "react";
import { createStorageStore } from "@/lib/createStorageStore";
import { isSupportedCurrency } from "@/lib/money";
import { isOpeningBalance, type OpeningBalance } from "@/lib/summary";

export type Settings = {
  /** The currency new transactions use, or null until the user picks one. */
  currency: string | null;
  /** What the account held at the start of a day, or null if not given. */
  openingBalance: OpeningBalance | null;
};

const SETTINGS_STORAGE_KEY = "pocketwise.settings";
// openingBalance was added later without a new version: settings saved
// before it simply don't have one, which reads as "not given".
const SETTINGS_VERSION = 1;

const DEFAULT_SETTINGS: Settings = { currency: null, openingBalance: null };

// Unlike transactions, losing unreadable settings costs little: the user is
// simply asked again. So there's no backup here. Each field is checked on
// its own, so a damaged opening balance doesn't also lose the currency.
function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw === null) return DEFAULT_SETTINGS;
    const data = JSON.parse(raw) as {
      version?: unknown;
      currency?: unknown;
      openingBalance?: unknown;
    };
    if (data.version !== SETTINGS_VERSION) return DEFAULT_SETTINGS;
    return {
      currency:
        typeof data.currency === "string" && isSupportedCurrency(data.currency)
          ? data.currency
          : null,
      openingBalance: isOpeningBalance(data.openingBalance)
        ? data.openingBalance
        : null,
    };
  } catch {
    // Blocked storage or unreadable data: fall back to the defaults.
    return DEFAULT_SETTINGS;
  }
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

/** Saves the opening balance, or removes it with null. */
export function setOpeningBalance(openingBalance: OpeningBalance | null): boolean {
  return store.update((previous) => ({ ...previous, openingBalance }));
}
