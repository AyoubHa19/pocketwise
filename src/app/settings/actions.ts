"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; step: "signed-out" | "data" | "account"; message: string };

/**
 * Deletes the signed-in user's account, on the server, in this order:
 *
 * 1. Their data in Convex, as them (with their own sign-in token, so Convex
 *    still checks who's asking), batch by batch until none is left.
 * 2. A check, read back from Convex, that nothing is left.
 * 3. Only then their Clerk account (this needs the secret key, which is
 *    why it runs here and never in the browser).
 *
 * Deleting the account first would leave data no one can sign in to, so if
 * any step fails it stops there and says which, and trying again is safe.
 * It only ever acts on the user making the request: the user id comes from
 * their session, never from what the browser sends.
 */
export async function deleteMyAccount(): Promise<DeleteAccountResult> {
  const session = await auth();
  if (!session.userId) {
    return { ok: false, step: "signed-out", message: "You need to be signed in." };
  }

  // The token Convex accepts: Clerk's session token when the Convex
  // integration is on (audience "convex"), else the "convex" JWT template.
  // The same rule convex/react-clerk uses in the browser.
  const token =
    session.sessionClaims?.aud === "convex"
      ? await session.getToken()
      : await session.getToken({ template: "convex" });
  if (!token) {
    return { ok: false, step: "data", message: "Pocketwise's server couldn't confirm your sign-in. Nothing was deleted." };
  }

  try {
    for (let round = 0; round < 1000; round++) {
      const { more } = await fetchMutation(api.account.deleteMyData, {}, { token });
      if (!more) break;
    }
    const [left, goals, entries, budgets, accounts, categories, settings] = await Promise.all([
      fetchQuery(api.transactions.list, {}, { token }),
      fetchQuery(api.goals.list, {}, { token }),
      fetchQuery(api.goals.contributions, {}, { token }),
      fetchQuery(api.budgets.list, {}, { token }),
      fetchQuery(api.accounts.list, {}, { token }),
      fetchQuery(api.categories.list, {}, { token }),
      fetchQuery(api.settings.get, {}, { token }),
    ]);
    if (
      left.length > 0 ||
      goals.length > 0 ||
      entries.length > 0 ||
      budgets.length > 0 ||
      accounts.length > 0 ||
      categories.length > 0 ||
      settings.currency !== null ||
      settings.openingBalance !== null
    ) {
      return { ok: false, step: "data", message: "Some of your data couldn't be deleted. Your account was kept. Try again." };
    }
  } catch {
    return { ok: false, step: "data", message: "Your data couldn't be deleted just now, so your account was kept. Check your connection and try again." };
  }

  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(session.userId);
  } catch {
    return {
      ok: false,
      step: "account",
      message: "Your data was deleted, but your account couldn't be. Try again to finish.",
    };
  }
  return { ok: true };
}
