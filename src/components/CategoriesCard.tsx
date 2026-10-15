"use client";

import { Archive, Pencil } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import {
  cardClass,
  colorTransition,
  fieldClass,
  pressable,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/formStyles";
import { ShortList } from "@/components/ShowMore";
import { Toast, type Notice } from "@/components/Toast";
import {
  useAccountTransactions,
  useCategories,
  useCreateCategory,
  useRenameCategory,
  useSetCategoryArchived,
  type SaveResult,
} from "@/lib/accountData";
import {
  CATEGORY_KIND_LABELS,
  categoryNameProblem,
  MAX_CATEGORY_NAME_LENGTH,
  type Category,
  type CategoryKind,
} from "@/lib/categories";

const KINDS: CategoryKind[] = ["expense", "income"];

// A 44px square button with just an icon; its label is for screen readers
// and shows as a tooltip.
const iconButtonClass = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-muted hover:bg-surface-muted hover:text-foreground ${pressable}`;
const smallButtonClass = `inline-flex min-h-11 shrink-0 items-center rounded-control border border-line-strong px-3 text-sm font-medium hover:bg-surface-muted ${pressable}`;

/**
 * Settings: the user's categories, for spending and for income. Rename one
 * and every transaction in it shows the new name; archive one to stop
 * offering it, while past transactions keep it (PRD 9).
 */
export function CategoriesCard() {
  const categories = useCategories();
  const transactions = useAccountTransactions();
  const createCategory = useCreateCategory();
  const renameCategory = useRenameCategory();
  const setArchived = useSetCategoryArchived();

  const [renaming, setRenaming] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (categories === null) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  // How many transactions each category has, to help decide what to archive.
  const counts = new Map<string, number>();
  for (const t of transactions ?? []) {
    if (t.categoryId) counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1);
  }
  const archived = categories.filter((c) => c.archived);

  function say(text: string) {
    setError(null);
    setNotice((previous) => ({ id: (previous?.id ?? 0) + 1, text }));
  }

  async function act(run: Promise<SaveResult>, done: string): Promise<boolean> {
    const result = await run;
    if (result.ok) say(done);
    else setError(result.message);
    return result.ok;
  }

  function row(category: Category) {
    const count = counts.get(category.id) ?? 0;
    if (renaming === category.id) {
      return (
        <li key={category.id} className="py-2">
          <NameForm
            label={`New name for ${category.name}`}
            initial={category.name}
            submitLabel="Save"
            check={(name) =>
              categoryNameProblem(
                name,
                category.kind,
                categories!.filter((c) => c.id !== category.id),
              )
            }
            onCancel={() => setRenaming(null)}
            onSubmit={async (name) => {
              const ok = await act(renameCategory(category.id, name), `Renamed to ${name.trim()}`);
              if (ok) setRenaming(null);
              return ok;
            }}
          />
        </li>
      );
    }
    return (
      <li key={category.id} className="flex min-h-14 items-center gap-3 py-1.5">
        <CategoryIcon category={category.name} small />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{category.name}</p>
          <p className="text-xs text-muted">
            {count === 0 ? "No transactions" : count === 1 ? "1 transaction" : `${count} transactions`}
          </p>
        </div>
        {category.archived ? (
          <button
            type="button"
            aria-label={`Bring back ${category.name}`}
            onClick={() => void act(setArchived(category.id, false), `${category.name} brought back`)}
            className={smallButtonClass}
          >
            Bring back
          </button>
        ) : (
          <>
            <button
              type="button"
              aria-label={`Rename ${category.name}`}
              title="Rename"
              onClick={() => {
                setError(null);
                setRenaming(category.id);
              }}
              className={iconButtonClass}
            >
              <Pencil size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`Archive ${category.name}`}
              title="Archive"
              onClick={() => void act(setArchived(category.id, true), `${category.name} archived`)}
              className={iconButtonClass}
            >
              <Archive size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </>
        )}
      </li>
    );
  }

  return (
    <section
      aria-labelledby="categories-heading"
      className={`${cardClass} p-4 sm:p-6 lg:col-span-2`}
    >
      <h2 id="categories-heading" className="text-lg font-semibold">
        Categories
      </h2>
      <p className="mt-1 max-w-prose text-sm text-muted">
        Rename a category and every transaction in it shows the new name.
        Archive one you no longer use: it&apos;s no longer offered, and past
        transactions keep it.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-control border border-danger-line bg-danger-surface px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-8 md:grid-cols-2 md:gap-x-10">
        {KINDS.map((kind) => {
          const open = categories.filter((c) => c.kind === kind && !c.archived);
          return (
            <section key={kind} aria-labelledby={`categories-${kind}`}>
              <h3 id={`categories-${kind}`} className="font-semibold">
                {CATEGORY_KIND_LABELS[kind]}
              </h3>
              <ShortList items={open} initial={8} noun="categories">
                {(visible) => <ul className="mt-2 divide-y divide-line">{visible.map(row)}</ul>}
              </ShortList>
              <div className="mt-3">
                <NameForm
                  label={`New ${CATEGORY_KIND_LABELS[kind].toLowerCase()} category`}
                  initial=""
                  submitLabel="Add"
                  clearAfter
                  check={(name) => categoryNameProblem(name, kind, categories)}
                  onSubmit={(name) => act(createCategory(name, kind), `${name.trim()} added`)}
                />
              </div>
            </section>
          );
        })}
      </div>

      {archived.length > 0 && (
        <details className="mt-8">
          <summary
            className={`flex min-h-11 cursor-pointer items-center rounded-control px-1 font-semibold hover:bg-surface-muted ${colorTransition}`}
          >
            Archived ({archived.length})
          </summary>
          <ul className="mt-2 divide-y divide-line">{archived.map(row)}</ul>
        </details>
      )}

      <Toast notice={notice} />
    </section>
  );
}

/**
 * A one-field form for a category name, used to add and to rename. It
 * checks the name with the same rules as the server first, so a mistake is
 * explained before anything is sent.
 */
function NameForm({
  label,
  initial,
  submitLabel,
  clearAfter = false,
  check,
  onSubmit,
  onCancel,
}: {
  label: string;
  initial: string;
  submitLabel: string;
  /** Empty the field after a successful submit (for adding). */
  clearAfter?: boolean;
  check: (name: string) => string | null;
  onSubmit: (name: string) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const errorId = useId();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = check(name);
    setProblem(found);
    if (found) return;
    setBusy(true);
    const ok = await onSubmit(name);
    setBusy(false);
    if (ok && clearAfter) setName("");
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label className="block text-sm font-medium">
        {label}
        <input
          type="text"
          value={name}
          maxLength={MAX_CATEGORY_NAME_LENGTH}
          autoFocus={onCancel !== undefined}
          autoComplete="off"
          onChange={(event) => {
            setName(event.target.value);
            setProblem(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && onCancel) onCancel();
          }}
          className={fieldClass}
          {...(problem && { "aria-invalid": true, "aria-describedby": errorId })}
        />
      </label>
      {problem && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-danger">
          {problem}
        </p>
      )}
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={secondaryButtonClass}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
