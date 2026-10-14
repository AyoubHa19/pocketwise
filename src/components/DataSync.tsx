"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../convex/_generated/api";

/** Calls `step` until it says there's no more, with a safety limit. */
async function untilDone(step: () => Promise<{ more: boolean }>) {
  for (let round = 0; round < 100; round++) {
    if (!(await step()).more) break;
  }
}

/**
 * Brings the signed-in user's data up to date with how Pocketwise now
 * keeps it, once per visit: accounts (ensureAccounts moves the old
 * Settings starting balance into an account and gives any old transaction
 * its account) and categories (ensureCategories gives the default list to
 * a user who has none, and links old transactions to their category).
 * Both are safe to repeat, and are called again while there's more. Draws
 * nothing; if one fails, the next visit tries again.
 */
export function DataSync() {
  const { isAuthenticated } = useConvexAuth();
  const ensureAccounts = useMutation(api.accounts.ensureAccounts);
  const ensureCategories = useMutation(api.categories.ensureCategories);
  const started = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || started.current) return;
    started.current = true;
    // Nothing to show if one fails: the screens wait for it, and the next
    // visit retries.
    void untilDone(() => ensureAccounts({})).catch(() => {});
    void untilDone(() => ensureCategories({})).catch(() => {});
  }, [isAuthenticated, ensureAccounts, ensureCategories]);

  return null;
}
