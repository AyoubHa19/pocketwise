"use client";

import { Camera, TriangleAlert } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/components/formStyles";
import { useScanReceipt } from "@/lib/accountData";
import type { Account } from "@/lib/accounts";
import type { Category } from "@/lib/categories";
import { formatMoney } from "@/lib/money";
import { formatDay, type DateOrder } from "@/lib/preferences";
import {
  describeTransaction,
  MAX_RECEIPT_BYTES,
  possibleDuplicates,
  RECEIPT_MAX_SIDE,
  receiptDraft,
  type ReceiptDraft,
  type ReceiptReading,
} from "@/lib/receipts";
import type { Transaction } from "@/lib/transactions";

type State =
  | { step: "idle" }
  | { step: "working"; text: string }
  | { step: "review"; reading: ReceiptReading; draft: ReceiptDraft; duplicates: Transaction[] }
  | { step: "failed"; message: string };

/**
 * The photo as a JPEG at most RECEIPT_MAX_SIDE pixels on its longer side:
 * smaller to upload, cheaper to read, and as much detail as the model uses.
 * The browser turns it upright from its EXIF orientation.
 */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, RECEIPT_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob"))), "image/jpeg", 0.85),
  );
}

/**
 * "Scan a receipt": take or pick a photo, have it read on the server, and
 * review what was found before anything is saved (PRD 20). "Check and save"
 * opens the usual transaction form, filled in, where every field can still
 * be changed; nothing is recorded until the user saves there.
 */
export function ReceiptScanner({
  accounts,
  categories,
  transactions,
  mainCurrency,
  today,
  dateOrder,
  onReview,
}: {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  mainCurrency: string;
  today: string;
  dateOrder: DateOrder;
  onReview: (draft: Transaction) => void;
}) {
  const scanReceipt = useScanReceipt();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ step: "idle" });

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared, so choosing the same photo again still triggers a change.
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setState({ step: "failed", message: "Choose a photo of the receipt." });
      return;
    }
    setState({ step: "working", text: "Preparing the photo…" });
    let image: Blob;
    try {
      image = await shrink(file);
    } catch {
      setState({
        step: "failed",
        message: "This photo couldn't be opened here. Try a JPEG or PNG, or take the photo again.",
      });
      return;
    }
    if (image.size > MAX_RECEIPT_BYTES) {
      setState({ step: "failed", message: "That photo is too large. Try a smaller one." });
      return;
    }
    setState({ step: "working", text: "Reading the receipt… this takes a few seconds." });
    const result = await scanReceipt(image);
    if (!result.ok) {
      setState({ step: "failed", message: result.message });
      return;
    }
    const draft = receiptDraft(result.reading, { accounts, categories, mainCurrency, today });
    setState({
      step: "review",
      reading: result.reading,
      draft,
      duplicates: possibleDuplicates(draft.transaction, transactions),
    });
  }

  const busy = state.step === "working";

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className={`${secondaryButtonClass} gap-2`}
      >
        <Camera size={18} aria-hidden="true" />
        Scan a receipt
      </button>

      {/* Always on the page, so each step is announced. */}
      <p role="status" className={busy ? "mt-3 text-sm text-muted" : "sr-only"}>
        {busy ? state.text : ""}
      </p>

      {state.step === "failed" && (
        <p role="alert" className="mt-3 rounded-control border border-danger-line bg-danger-surface px-4 py-3 text-sm text-danger">
          {state.message}
        </p>
      )}

      {state.step === "review" && (
        <section aria-labelledby="receipt-heading" className={`${cardClass} mt-4 p-4 sm:p-6`}>
          <h3 id="receipt-heading" className="font-semibold">
            From your receipt
          </h3>
          <p className="mt-1 text-sm text-muted">Check it: nothing is saved until you save it in the next step.</p>
          <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">Shop</dt>
            <dd className="truncate">{state.reading.merchant || "—"}</dd>
            <dt className="text-muted">Date</dt>
            <dd>{formatDay(state.draft.transaction.date, today, dateOrder)}</dd>
            <dt className="text-muted">Total</dt>
            <dd className="font-medium tabular-nums">
              {state.draft.amountRead ? formatMoney(state.draft.transaction.amount) : "—"}
            </dd>
            <dt className="text-muted">Category</dt>
            <dd>{state.draft.transaction.category}</dd>
          </dl>
          {state.reading.items.length > 0 && (
            <details className="mt-2 text-sm">
              <summary className="min-h-11 cursor-pointer content-center text-muted">
                {state.reading.items.length === 1 ? "1 item" : `${state.reading.items.length} items`}
              </summary>
              <ul className="space-y-0.5 pb-1">
                {state.reading.items.map((item, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">{item.name}</span>
                    <span className="shrink-0 tabular-nums text-muted">{item.amount}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {(state.draft.warnings.length > 0 || state.duplicates.length > 0) && (
            <ul className="mt-3 space-y-1 text-sm">
              {state.draft.warnings.map((w) => (
                <li key={w} className="flex gap-2">
                  <TriangleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-warning" />
                  {w}
                </li>
              ))}
              {state.duplicates.length > 0 && (
                <li className="flex gap-2">
                  <TriangleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-warning" />
                  You may have recorded this already: {state.duplicates.map(describeTransaction).join("; ")}.
                </li>
              )}
            </ul>
          )}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                onReview(state.draft.transaction);
                setState({ step: "idle" });
              }}
              className={primaryButtonClass}
            >
              Check and save
            </button>
            <button type="button" onClick={() => setState({ step: "idle" })} className={secondaryButtonClass}>
              Discard
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
