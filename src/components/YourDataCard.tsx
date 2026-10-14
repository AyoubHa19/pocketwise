"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  cardClass,
  dangerButtonClass,
  fieldClass,
  secondaryButtonClass,
} from "@/components/formStyles";
import { deleteMyAccount } from "@/app/settings/actions";
import { useAccounts, useAccountTransactions } from "@/lib/accountData";
import { csvFileName, transactionsToCsv } from "@/lib/csv";
import { clearLocalData, hasLocalData } from "@/lib/localImport";
import { useSettings } from "@/lib/settingsStore";
import { useTransactions } from "@/lib/transactionStore";
import { useToday } from "@/lib/useToday";

const CONFIRM_WORD = "DELETE";

/**
 * Gives the browser a file to save, made from text in memory. The link is
 * put on the page for the click (some browsers ignore clicks on links that
 * aren't), and the file is kept in memory for a minute, because releasing
 * it straight away can cancel the download before it starts.
 */
function download(text: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Settings: what the user can do with their data. Download it as CSV,
 * delete the copy this browser kept from before accounts, or delete their
 * account and everything in it.
 */
export function YourDataCard() {
  const transactions = useAccountTransactions();
  const accounts = useAccounts();
  const localSettings = useSettings();
  const localTransactions = useTransactions();
  const today = useToday();
  const { signOut } = useClerk();
  const router = useRouter();

  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasBrowserCopy =
    localSettings !== null &&
    localTransactions !== null &&
    hasLocalData(localSettings, localTransactions);

  function deleteBrowserCopy() {
    const confirmed = window.confirm(
      "Delete the copy of your old data saved in this browser? Your account isn't affected.",
    );
    if (!confirmed) return;
    if (clearLocalData() === null) {
      setError("This browser wouldn't let Pocketwise delete its copy.");
      return;
    }
    // The page reads the browser's storage once; start afresh to show it's gone.
    window.location.reload();
  }

  async function handleDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (typed !== CONFIRM_WORD) return;
    setDeleting(true);
    setError(null);
    const result = await deleteMyAccount();
    if (!result.ok) {
      setDeleting(false);
      setError(result.message);
      return;
    }
    // Everything is gone from the account, so this browser's copy goes too.
    clearLocalData();
    // The account no longer exists; signing out just tidies this browser.
    try {
      await signOut({ redirectUrl: "/sign-in" });
    } catch {
      router.replace("/sign-in");
    }
  }

  const count = transactions?.length ?? 0;

  return (
    <section
      aria-labelledby="your-data-heading"
      className={`${cardClass} max-w-lg p-4 sm:p-6 lg:max-w-none`}
    >
      <h2 id="your-data-heading" className="text-lg font-semibold">
        Your data
      </h2>

      <h3 className="mt-4 text-sm font-medium">Download</h3>
      <p className="mt-1 text-sm text-muted">
        All your transactions as a CSV file, which Excel, Google Sheets and
        Numbers can open.
      </p>
      <button
        type="button"
        disabled={transactions === null}
        onClick={() =>
          transactions &&
          download(
            transactionsToCsv(transactions, new Map((accounts ?? []).map((a) => [a.id, a.name]))),
            csvFileName(today),
          )
        }
        className={`mt-3 ${secondaryButtonClass}`}
      >
        {transactions === null
          ? "Loading…"
          : `Download ${count} transaction${count === 1 ? "" : "s"} (CSV)`}
      </button>

      {hasBrowserCopy && (
        <>
          <h3 className="mt-6 text-sm font-medium">This browser&apos;s old copy</h3>
          <p className="mt-1 text-sm text-muted">
            This browser still keeps what it saved before you had an account
            {localTransactions.length > 0
              ? ` (${localTransactions.length} transaction${localTransactions.length === 1 ? "" : "s"})`
              : ""}
            . You can delete it; your account isn&apos;t affected.
          </p>
          <button
            type="button"
            onClick={deleteBrowserCopy}
            className={`mt-3 ${secondaryButtonClass}`}
          >
            Delete this browser&apos;s copy
          </button>
        </>
      )}

      <h3 className="mt-6 text-sm font-medium text-danger">Delete your account</h3>
      <p className="mt-1 text-sm text-muted">
        Deletes all your transactions, budgets, accounts, categories and
        settings, then your account. This can&apos;t be undone, so download your data first if you want to keep it.
      </p>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={`mt-3 ${dangerButtonClass} border border-danger-line sm:ml-0`}
        >
          Delete my account
        </button>
      ) : (
        <form
          onSubmit={handleDelete}
          className="mt-3 rounded-control border border-danger-line bg-danger-surface p-4"
        >
          <label className="block text-sm font-medium">
            Type {CONFIRM_WORD} to confirm
            <input
              type="text"
              autoComplete="off"
              autoFocus
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              disabled={deleting}
              className={fieldClass}
            />
          </label>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={typed !== CONFIRM_WORD || deleting}
              className={`${dangerButtonClass} border border-danger-line bg-surface sm:ml-0`}
            >
              {deleting ? "Deleting…" : "Delete everything"}
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                setConfirming(false);
                setTyped("");
                setError(null);
              }}
              className={secondaryButtonClass}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
