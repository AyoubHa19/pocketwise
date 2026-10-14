"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../convex/_generated/api";

/**
 * Makes sure the signed-in user's data uses accounts: once per visit, it
 * asks the server to move the old Settings starting balance into an
 * account and give any old transaction its account (ensureAccounts, which
 * is safe to repeat), calling again while there's more. Draws nothing; if
 * it fails, the next visit tries again.
 */
export function AccountsSync() {
  const { isAuthenticated } = useConvexAuth();
  const ensureAccounts = useMutation(api.accounts.ensureAccounts);
  const started = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || started.current) return;
    started.current = true;
    void (async () => {
      try {
        for (let round = 0; round < 100; round++) {
          if (!(await ensureAccounts({})).more) break;
        }
      } catch {
        // Nothing to show: balances wait for it, and the next visit retries.
      }
    })();
  }, [isAuthenticated, ensureAccounts]);

  return null;
}
