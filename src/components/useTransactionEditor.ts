"use client";

import { useEffect, useState } from "react";
import type { Notice } from "@/components/Toast";
import { useRemoveTransaction, useSaveTransaction } from "@/lib/accountData";
import { formatMoney } from "@/lib/money";
import { signedAmount, type Transaction } from "@/lib/transactions";

/**
 * Whether the sheet is showing, and for what. It closes by setting `open`
 * to false but keeps `kind` and `id`, so it slides away still showing what
 * it showed, not an empty or different form. `session` goes up with every
 * opening and gives the form a fresh start each time.
 */
type SheetState = { open: boolean; session: number } & (
  | { kind: "add" }
  | { kind: "edit"; id: string }
);

/**
 * Adding, editing and deleting transactions in a sheet, shared by the
 * dashboard and the Transactions page: the sheet's state, saving and
 * deleting (with a confirmation), and the message that says how it went.
 * `onSaved` runs as a save starts, for the page to follow the transaction
 * (the dashboard moves to its month).
 */
export function useTransactionEditor(
  transactions: Transaction[] | null,
  onSaved?: (transaction: Transaction) => void,
) {
  const saveTransaction = useSaveTransaction();
  const deleteTransaction = useRemoveTransaction();
  const [sheet, setSheet] = useState<SheetState>({ kind: "add", open: false, session: 0 });
  const [saveFailed, setSaveFailed] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  // A confirmation stays for 4 seconds; a newer one restarts the clock.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Looked up by id, so if the transaction disappears while its sheet is
  // open (say, deleted in another tab), the sheet simply closes.
  const editing = sheet.kind === "edit" ? transactions?.find((t) => t.id === sheet.id) : undefined;
  const hasContent = sheet.kind === "add" || editing !== undefined;
  const sheetOpen = sheet.open && hasContent;

  function openAdd() {
    setSheet((previous) => ({ kind: "add", open: true, session: previous.session + 1 }));
  }

  function openEdit(transaction: Transaction) {
    setSheet((previous) => ({
      kind: "edit",
      id: transaction.id,
      open: true,
      session: previous.session + 1,
    }));
  }

  function closeSheet() {
    setSheet((previous) => ({ ...previous, open: false }));
  }

  // Only once the account really saved: otherwise the warning says so.
  function report(saved: boolean, text: string) {
    setSaveFailed(!saved);
    setNotice(saved ? { id: Date.now(), text } : null);
  }

  async function save(transaction: Transaction) {
    const isNew = !transactions?.some((t) => t.id === transaction.id);
    // The change is on screen straight away; the message waits for the
    // server to confirm it.
    closeSheet();
    onSaved?.(transaction);
    const isTransfer = transaction.type === "transfer";
    report(
      await saveTransaction(transaction),
      isNew ? (isTransfer ? "Transfer added" : "Transaction added") : "Changes saved",
    );
  }

  async function remove(transaction: Transaction) {
    const amount = formatMoney(signedAmount(transaction));
    const what =
      transaction.type === "transfer" ? "this transfer" : (transaction.description ?? transaction.category);
    const confirmed = window.confirm(
      `Delete ${what}, ${amount} on ${transaction.date}? This can't be undone.`,
    );
    if (!confirmed) return;

    closeSheet();
    report(await deleteTransaction(transaction.id), "Transaction deleted");
  }

  return {
    sheet,
    editing,
    hasContent,
    sheetOpen,
    saveFailed,
    notice,
    openAdd,
    openEdit,
    closeSheet,
    report,
    save,
    remove,
  };
}
