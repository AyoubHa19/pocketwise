"use client";

import { useConvex, useMutation } from "convex/react";
import { useState, useSyncExternalStore } from "react";
import {
  cardClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/formStyles";
import {
  batches,
  hasLocalData,
  IMPORT_BATCH_SIZE,
  IMPORT_MARKER_KEY,
  isImportMarker,
  missingAfterImport,
  writeImportMarker,
} from "@/lib/localImport";
import { formatMoney } from "@/lib/money";
import { useSettings, type Settings } from "@/lib/settingsStore";
import { useTransactions } from "@/lib/transactionStore";
import type { Transaction } from "@/lib/transactions";
import { api } from "../../convex/_generated/api";

/** What this browser saved before accounts existed, still to be moved. */
export type LocalData = { settings: Settings; transactions: Transaction[] };

// The marker is read as raw text, which React can compare between renders;
// "marker-written" is sent after saving it, so the offer disappears at once.
const MARKER_EVENT = "pocketwise:marker-written";

function subscribeToMarker(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(MARKER_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(MARKER_EVENT, onChange);
  };
}

function readMarkerText(): string | null {
  try {
    return localStorage.getItem(IMPORT_MARKER_KEY);
  } catch {
    return null;
  }
}

function markHandled(status: "imported" | "dismissed") {
  writeImportMarker(status);
  window.dispatchEvent(new Event(MARKER_EVENT));
}

/**
 * The browser's own data, if it should be offered for moving: undefined
 * while it's being read, null when there's nothing to offer (no old data,
 * or it was already moved or set aside in this browser).
 */
export function useLocalDataOffer(): LocalData | null | undefined {
  const settings = useSettings();
  const transactions = useTransactions();
  const marker = useSyncExternalStore(subscribeToMarker, readMarkerText, () => undefined);
  if (settings === null || transactions === null || marker === undefined) return undefined;
  if (marker !== null) {
    try {
      if (isImportMarker(JSON.parse(marker))) return null;
    } catch {
      // An unreadable marker counts as none, so the offer is made again.
    }
  }
  return hasLocalData(settings, transactions) ? { settings, transactions } : null;
}

type Phase =
  | { name: "idle" }
  | { name: "moving"; done: number }
  | { name: "failed"; message: string };

type Props = {
  local: LocalData;
  account: { settings: Settings; transactions: Transaction[] };
  /** Called once everything arrived and was checked, with a message. */
  onMoved: (message: string) => void;
};

/**
 * Offers to move the browser's old data into the account, moves it in
 * batches, and checks that every transaction arrived before saying so.
 * Nothing is ever deleted from the browser: its copy stays as a backup.
 */
export function LocalDataImport({ local, account, onMoved }: Props) {
  const convex = useConvex();
  const importTransactions = useMutation(api.transactions.importLocal);
  const importSettings = useMutation(api.settings.importLocal);
  const [phase, setPhase] = useState<Phase>({ name: "idle" });

  const accountIsEmpty =
    account.transactions.length === 0 &&
    account.settings.currency === null &&
    account.settings.openingBalance === null;
  const toMove = local.transactions.filter(
    (t) => missingAfterImport([t], account.transactions).length > 0,
  );
  const settingsToFill =
    (local.settings.currency !== null && account.settings.currency === null) ||
    (local.settings.openingBalance !== null && account.settings.openingBalance === null);

  // Everything is already in the account (moved from another tab, say):
  // there's nothing to offer.
  if (toMove.length === 0 && !settingsToFill && phase.name !== "moving") return null;

  async function move() {
    setPhase({ name: "moving", done: 0 });
    try {
      await importSettings({
        currency: local.settings.currency,
        openingBalance: local.settings.openingBalance,
      });
      let done = 0;
      for (const batch of batches(local.transactions, IMPORT_BATCH_SIZE)) {
        await importTransactions({ transactions: batch });
        done += batch.length;
        setPhase({ name: "moving", done });
      }
      // Check against a fresh copy from the server, not the screen's.
      const [inAccount, settings] = await Promise.all([
        convex.query(api.transactions.list, {}),
        convex.query(api.settings.get, {}),
      ]);
      const missing = missingAfterImport(local.transactions, inAccount);
      const settingsMissing =
        (local.settings.currency !== null && settings.currency === null) ||
        (local.settings.openingBalance !== null && settings.openingBalance === null);
      if (missing.length > 0 || settingsMissing) {
        setPhase({
          name: "failed",
          message: `${missing.length} transaction${missing.length === 1 ? "" : "s"} didn't arrive${settingsMissing ? ", nor your settings" : ""}. Nothing was deleted from this browser. Try again.`,
        });
        return;
      }
      markHandled("imported");
      onMoved(
        local.transactions.length > 0
          ? `Moved ${local.transactions.length} transaction${local.transactions.length === 1 ? "" : "s"} to your account`
          : "Moved your settings to your account",
      );
    } catch {
      setPhase({
        name: "failed",
        message:
          "Pocketwise couldn't move your data just now. Nothing was deleted from this browser, and what already arrived won't be copied twice. Check your connection and try again.",
      });
    }
  }

  const moving = phase.name === "moving";
  const count = toMove.length;
  const what = [
    count > 0 && `${count} transaction${count === 1 ? "" : "s"}`,
    settingsToFill && describeSettings(local.settings),
  ]
    .filter(Boolean)
    .join(" and ");
  const them = count + (settingsToFill ? 1 : 0) === 1 ? "it" : "them";

  return (
    <section
      aria-labelledby="local-import-heading"
      className={
        accountIsEmpty
          ? "mx-auto max-w-lg sm:py-8"
          : `${cardClass} mb-8 p-4 sm:p-6`
      }
    >
      <h2
        id="local-import-heading"
        className={
          accountIsEmpty
            ? "text-2xl font-semibold tracking-tight sm:text-3xl"
            : "text-lg font-semibold"
        }
      >
        {accountIsEmpty ? "Move your data to your account" : "This browser has data that isn't in your account"}
      </h2>
      <div className={accountIsEmpty ? `${cardClass} mt-6 p-4 sm:p-6` : ""}>
        <p className="text-sm text-muted">
          This browser has {what} from before you had an account. Move {them}{" "}
          to your account to keep {them} safe and see {them} wherever you sign
          in.
          {!accountIsEmpty && " Anything already in your account stays as it is."}
        </p>
        <p className="mt-2 text-sm text-muted">
          Nothing is deleted from this browser: it keeps its copy as a backup.
        </p>

        {phase.name === "failed" && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {phase.message}
          </p>
        )}
        {/* Progress in words, announced as it changes. The region stays on
            the page (hidden when idle) so screen readers reliably hear it. */}
        <p role="status" className={moving ? "mt-4 text-sm text-muted" : "sr-only"}>
          {moving
            ? `Moving… ${phase.done} of ${local.transactions.length} transactions sent.`
            : ""}
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={move}
            disabled={moving}
            className={primaryButtonClass}
          >
            {moving ? "Moving…" : phase.name === "failed" ? "Try again" : "Move my data"}
          </button>
          <button
            type="button"
            onClick={() => markHandled("dismissed")}
            disabled={moving}
            className={secondaryButtonClass}
          >
            {accountIsEmpty ? "Start fresh instead" : "Don't move it"}
          </button>
        </div>
      </div>
    </section>
  );
}

/** "your settings (AED, starting balance AED 3,000.00)" */
function describeSettings(settings: Settings): string {
  const parts = [
    settings.currency,
    settings.openingBalance &&
      `starting balance ${formatMoney(settings.openingBalance)}`,
  ].filter(Boolean);
  return `your settings (${parts.join(", ")})`;
}
